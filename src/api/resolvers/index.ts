import { prisma } from '../../lib/prisma';
import { graphQLCache } from '../../lib/cache';
import { AuthContext } from '../../lib/auth';

// Helper function to check authentication
const requireAuth = (context: any): AuthContext => {
  if (!context.auth?.isAuthenticated) {
    throw new Error('Authentication required');
  }
  return context.auth;
};

// Helper function to check permissions
const requirePermission = (context: any, permission: string): void => {
  const auth = requireAuth(context);
  if (!auth.hasPermission(permission)) {
    throw new Error(`Permission denied: ${permission} required`);
  }
};

// Helper function to check roles
const requireRole = (context: any, role: string): void => {
  const auth = requireAuth(context);
  if (!auth.hasRole(role)) {
    throw new Error(`Role required: ${role}`);
  }
};

export const resolvers = {
  Query: {
    validators: async (_: any, __: any, context: any) => {
      try {
        // Check if we have cached data
        const cacheKey = 'validators:all';
        const cached = await graphQLCache.get(cacheKey);
        
        if (cached) {
          console.log('✅ Returning cached validators data');
          return cached;
        }

        console.log('🔄 Fetching validators from database...');
        const validators = await prisma.validator.findMany({
          include: {
            trustScores: {
              orderBy: { createdAt: 'desc' },
              take: 1, // Get only the latest score
              include: {
                scoringRun: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        const result = validators.map(validator => ({
          id: validator.id,
          voteAccount: validator.voteAccount,
          name: validator.name,
          validatorPubkey: validator.validatorPubkey,
          commission: validator.commission,
          uptime: validator.uptime,
          trustScores: validator.trustScores.map(score => ({
            id: score.id,
            score: score.score,
            createdAt: score.createdAt.toISOString(),
            scoringRunId: score.scoringRunId,
            validatorId: score.validatorId,
            validator: {
              id: validator.id,
              validatorPubkey: validator.validatorPubkey,
              name: validator.name
            }
          })),
          latestTrustScore: validator.trustScores[0] ? {
            id: validator.trustScores[0].id,
            score: validator.trustScores[0].score,
            createdAt: validator.trustScores[0].createdAt.toISOString(),
            scoringRunId: validator.trustScores[0].scoringRunId,
            validatorId: validator.trustScores[0].validatorId,
            validator: {
              id: validator.id,
              validatorPubkey: validator.validatorPubkey,
              name: validator.name
            }
          } : null,
          createdAt: validator.createdAt.toISOString(),
          updatedAt: validator.updatedAt.toISOString()
        }));

        // Cache the result for 5 minutes
        await graphQLCache.set(cacheKey, result, undefined, { ttl: 300 });
        console.log('💾 Cached validators data');

        return result;
      } catch (error) {
        console.error('Error fetching validators:', error);
        throw new Error('Failed to fetch validators');
      }
    },

    // Protected endpoint - requires authentication
    users: async (_: any, __: any, context: any) => {
      try {
        requirePermission(context, 'read:users');
        
        const users = await prisma.user.findMany({
          include: {
            stakeAccounts: {
              include: {
                validator: {
                  select: {
                    validatorPubkey: true,
                    name: true
                  }
                }
              }
            }
          }
        });

        return users.map(user => ({
          id: user.id,
          walletPubkey: user.walletPubkey,
          stakeAccounts: user.stakeAccounts.map(stake => ({
            id: stake.id,
            walletPubkey: stake.walletPubkey,
            stakedAmount: stake.stakedAmount,
            validator: {
              validatorPubkey: stake.validator.validatorPubkey,
              name: stake.validator.name
            }
          }))
        }));
      } catch (error) {
        console.error('Error fetching users:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to fetch users');
      }
    },

    // Protected endpoint - requires authentication
    scoringRuns: async (_: any, __: any, context: any) => {
      try {
        requirePermission(context, 'read:scores');
        
        const runs = await prisma.scoringRun.findMany({
          include: {
            trustScores: {
              include: {
                validator: {
                  select: {
                    validatorPubkey: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: { runDate: 'desc' }
        });

        return runs.map(run => ({
          id: run.id,
          runDate: run.runDate.toISOString(),
          // Note: These fields will be available after schema update and Prisma client regeneration
          // status: run.status,
          // validatorCount: run.validatorCount,
          // successCount: run.successCount,
          // failCount: run.failCount,
          // createdAt: run.createdAt,
          trustScores: run.trustScores.map(score => ({
            id: score.id,
            score: score.score,
            createdAt: score.createdAt.toISOString(),
            scoringRunId: score.scoringRunId,
            validatorId: score.validatorId,
            validator: {
              validatorPubkey: score.validator.validatorPubkey,
              name: score.validator.name
            }
          }))
        }));
      } catch (error) {
        console.error('Error fetching scoring runs:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to fetch scoring runs');
      }
    },

    // New protected endpoint for admin operations
    systemStats: async (_: any, __: any, context: any) => {
      try {
        requireRole(context, 'admin');
        
        const [validatorCount, userCount, scoringRunCount] = await Promise.all([
          prisma.validator.count(),
          prisma.user.count(),
          prisma.scoringRun.count()
        ]);

        return {
          validatorCount,
          userCount,
          scoringRunCount,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error('Error fetching system stats:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to fetch system stats');
      }
    },

    // New endpoint for cache management (admin only)
    cacheStatus: async (_: any, __: any, context: any) => {
      try {
        requirePermission(context, 'admin:system');
        
        const stats = await graphQLCache.getStats();
        return {
          totalKeys: stats.totalKeys,
          memoryUsage: stats.memoryUsage,
          hitRate: stats.hitRate
        };
      } catch (error) {
        console.error('Error fetching cache status:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to fetch cache status');
      }
    }
  },

  Mutation: {
    // Protected mutation - requires authentication
    clearCache: async (_: any, __: any, context: any) => {
      try {
        requirePermission(context, 'admin:system');
        
        await graphQLCache.clearAll();
        return {
          success: true,
          message: 'Cache cleared successfully',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error('Error clearing cache:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to clear cache');
      }
    },

    // Protected mutation - requires authentication
    invalidateValidatorCache: async (_: any, __: any, context: any) => {
      try {
        requirePermission(context, 'admin:system');
        
        await graphQLCache.clearAll();
        return {
          success: true,
          message: 'Validator cache invalidated successfully',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error('Error invalidating validator cache:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to invalidate validator cache');
      }
    }
  }
};
