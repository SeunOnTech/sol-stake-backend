import { redis } from './redis';
import { createHash } from 'crypto';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
}

export interface CacheResult<T> {
  data: T;
  cached: boolean;
  ttl?: number;
}

export class GraphQLCache {
  private readonly defaultTTL = 300; // 5 minutes
  private readonly defaultPrefix = 'graphql';

  /**
   * Generate cache key for GraphQL query
   */
  private generateKey(query: string, variables?: any): string {
    const hash = createHash('sha256')
      .update(query + JSON.stringify(variables || {}))
      .digest('hex');
    
    return `${this.defaultPrefix}:${hash}`;
  }

  /**
   * Get cached data
   */
  async get<T>(query: string, variables?: any): Promise<T | null> {
    try {
      const key = this.generateKey(query, variables);
      const cached = await redis.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  async set<T>(
    query: string, 
    data: T, 
    variables?: any, 
    options?: CacheOptions
  ): Promise<void> {
    try {
      const key = this.generateKey(query, variables);
      const ttl = options?.ttl || this.defaultTTL;
      
      await redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Get cached data with cache status
   */
  async getWithStatus<T>(
    query: string, 
    variables?: any
  ): Promise<CacheResult<T | null>> {
    try {
      const key = this.generateKey(query, variables);
      const cached = await redis.get(key);
      
      if (cached) {
        const ttl = await redis.ttl(key);
        return {
          data: JSON.parse(cached),
          cached: true,
          ttl: ttl > 0 ? ttl : undefined
        };
      }
      
      return {
        data: null,
        cached: false
      };
    } catch (error) {
      console.error('Cache getWithStatus error:', error);
      return {
        data: null,
        cached: false
      };
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  /**
   * Clear all GraphQL cache
   */
  async clearAll(): Promise<void> {
    try {
      await this.invalidate(`${this.defaultPrefix}:*`);
    } catch (error) {
      console.error('Cache clearAll error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    try {
      const keys = await redis.keys(`${this.defaultPrefix}:*`);
      const info = await redis.info('memory');
      
      // Parse memory usage from Redis info
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';
      
      return {
        totalKeys: keys.length,
        memoryUsage,
        hitRate: undefined // Would need to implement hit tracking
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'unknown'
      };
    }
  }
}

// Export singleton instance
export const graphQLCache = new GraphQLCache();
