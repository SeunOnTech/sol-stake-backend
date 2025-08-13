import { redis } from './redis';
import { Request } from 'express';
import { AuthContext } from './auth';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Skip rate limiting for successful requests
  skipFailedRequests?: boolean; // Skip rate limiting for failed requests
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimiter {
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  };

  /**
   * Generate rate limit key based on IP and optional user ID
   */
  private generateKey(req: Request, prefix: string = 'rate_limit'): string {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const auth = (req as any).auth as AuthContext | undefined;
    const userId = auth?.user?.id || 'anonymous';
    
    return `${prefix}:${ip}:${userId}`;
  }

  /**
   * Check if request is allowed based on rate limit
   */
  async checkRateLimit(
    req: Request, 
    config: Partial<RateLimitConfig> = {}
  ): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const key = this.generateKey(req);
    const now = Date.now();
    const windowStart = now - finalConfig.windowMs;

    try {
      // Get current request count for this window
      const requests = await redis.zrangebyscore(key, windowStart, '+inf');
      const currentCount = requests.length;

      if (currentCount >= finalConfig.maxRequests) {
        // Rate limit exceeded
        const oldestRequest = await redis.zrange(key, 0, 0, 'WITHSCORES');
        const resetTime = oldestRequest.length > 0 
          ? parseInt(oldestRequest[1]) + finalConfig.windowMs 
          : now + finalConfig.windowMs;
        
        const retryAfter = Math.ceil((resetTime - now) / 1000);
        
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter
        };
      }

      // Add current request to the sorted set
      await redis.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiry for the key
      await redis.expire(key, Math.ceil(finalConfig.windowMs / 1000));

      return {
        allowed: true,
        remaining: finalConfig.maxRequests - currentCount - 1,
        resetTime: now + finalConfig.windowMs
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // On error, allow the request
      return {
        allowed: true,
        remaining: finalConfig.maxRequests,
        resetTime: now + finalConfig.windowMs
      };
    }
  }

  /**
   * Get rate limit info for a specific key
   */
  async getRateLimitInfo(req: Request, prefix: string = 'rate_limit'): Promise<{
    current: number;
    remaining: number;
    resetTime: number;
    limit: number;
  }> {
    const key = this.generateKey(req, prefix);
    const now = Date.now();
    const windowStart = now - 15 * 60 * 1000; // 15 minutes

    try {
      const requests = await redis.zrangebyscore(key, windowStart, '+inf');
      const current = requests.length;
      const limit = 100; // Default limit
      const resetTime = now + 15 * 60 * 1000;

      return {
        current,
        remaining: Math.max(0, limit - current),
        resetTime,
        limit
      };
    } catch (error) {
      console.error('Rate limit info error:', error);
      return {
        current: 0,
        remaining: 100,
        resetTime: now + 15 * 60 * 1000,
        limit: 100
      };
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetRateLimit(req: Request, prefix: string = 'rate_limit'): Promise<void> {
    const key = this.generateKey(req, prefix);
    
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Rate limit reset error:', error);
    }
  }

  /**
   * Get all rate limit keys (for admin purposes)
   */
  async getAllRateLimitKeys(prefix: string = 'rate_limit'): Promise<string[]> {
    try {
      return await redis.keys(`${prefix}:*`);
    } catch (error) {
      console.error('Get rate limit keys error:', error);
      return [];
    }
  }

  /**
   * Clear all rate limits (for admin purposes)
   */
  async clearAllRateLimits(prefix: string = 'rate_limit'): Promise<void> {
    try {
      const keys = await this.getAllRateLimitKeys(prefix);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Clear rate limits error:', error);
    }
  }

  /**
   * Get rate limit statistics
   */
  async getRateLimitStats(): Promise<{
    totalKeys: number;
    totalRequests: number;
    averageRequests: number;
  }> {
    try {
      const keys = await this.getAllRateLimitKeys();
      let totalRequests = 0;

      for (const key of keys) {
        const count = await redis.zcard(key);
        totalRequests += count;
      }

      return {
        totalKeys: keys.length,
        totalRequests,
        averageRequests: keys.length > 0 ? Math.round(totalRequests / keys.length) : 0
      };
    } catch (error) {
      console.error('Rate limit stats error:', error);
      return {
        totalKeys: 0,
        totalRequests: 0,
        averageRequests: 0
      };
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Export Express middleware
export const rateLimitMiddleware = (config: Partial<RateLimitConfig> = {}) => {
  return async (req: Request, res: any, next: any) => {
    const result = await rateLimiter.checkRateLimit(req, config);
    
    if (!result.allowed) {
      res.setHeader('X-RateLimit-Limit', config.maxRequests || 100);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetTime);
      res.setHeader('Retry-After', result.retryAfter);
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.retryAfter
      });
    }

    // Add rate limit headers to response
    res.setHeader('X-RateLimit-Limit', config.maxRequests || 100);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetTime);

    next();
  };
};
