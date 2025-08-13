import jwt from 'jsonwebtoken';
import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'viewer';
  permissions: string[];
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

export interface AuthContext {
  user: User | null;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export class AuthService {
  private readonly secretKey: string;
  private readonly tokenExpiry: string;

  constructor() {
    this.secretKey = process.env.JWT_SECRET_KEY || 'your-super-secret-jwt-key-change-in-production';
    this.tokenExpiry = process.env.JWT_EXPIRY || '24h';
  }

  /**
   * Generate JWT token for user
   */
  generateToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    };

    return jwt.sign(payload, this.secretKey, {
      expiresIn: this.tokenExpiry,
      issuer: 'sol-stake-backend',
      audience: 'sol-stake-users'
    } as jwt.SignOptions);
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.secretKey, {
        issuer: 'sol-stake-backend',
        audience: 'sol-stake-users'
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Extract token from request headers
   */
  extractTokenFromRequest(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  /**
   * Create authentication context from request
   */
  createAuthContext(req: Request): AuthContext {
    const token = this.extractTokenFromRequest(req);
    
    if (!token) {
      return {
        user: null,
        isAuthenticated: false,
        hasPermission: () => false,
        hasRole: () => false
      };
    }

    const payload = this.verifyToken(token);
    
    if (!payload) {
      return {
        user: null,
        isAuthenticated: false,
        hasPermission: () => false,
        hasRole: () => false
      };
    }

    const user: User = {
      id: payload.userId,
      email: payload.email,
      role: payload.role as User['role'],
      permissions: payload.permissions
    };

    return {
      user,
      isAuthenticated: true,
      hasPermission: (permission: string) => user.permissions.includes(permission),
      hasRole: (role: string) => user.role === role
    };
  }

  /**
   * Check if user has required permission
   */
  hasPermission(user: User | null, permission: string): boolean {
    return user?.permissions.includes(permission) || false;
  }

  /**
   * Check if user has required role
   */
  hasRole(user: User | null, role: string): boolean {
    return user?.role === role || false;
  }

  /**
   * Create mock user for testing (remove in production)
   */
  createMockUser(role: 'user' | 'admin' | 'viewer' = 'user'): User {
    const basePermissions = ['read:validators', 'read:scores'];
    
    const rolePermissions = {
      user: [...basePermissions, 'write:stakes'],
      admin: [...basePermissions, 'write:stakes', 'write:validators', 'admin:system'],
      viewer: basePermissions
    };

    return {
      id: `mock-${role}-${Date.now()}`,
      email: `mock-${role}@example.com`,
      role,
      permissions: rolePermissions[role]
    };
  }

  /**
   * Generate mock token for testing (remove in production)
   */
  generateMockToken(role: 'user' | 'admin' | 'viewer' = 'user'): string {
    const mockUser = this.createMockUser(role);
    return this.generateToken(mockUser);
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export middleware for Express
export const authMiddleware = (req: Request, res: any, next: any) => {
  const authContext = authService.createAuthContext(req);
  
  // Attach auth context to request
  (req as any).auth = authContext;
  
  next();
};

// Export GraphQL context creator
export const createGraphQLContext = (req: Request) => {
  return {
    auth: authService.createAuthContext(req),
    req
  };
};
