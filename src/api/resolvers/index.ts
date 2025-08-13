import { prisma } from '../../lib/prisma';

export const resolvers = {
  Query: {
    validators: async () => {
      try {
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

        return validators.map(validator => ({
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
      } catch (error) {
        console.error('Error fetching validators:', error);
        throw new Error('Failed to fetch validators');
      }
    },

    users: async () => {
      try {
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
        throw new Error('Failed to fetch users');
      }
    },

    // Updated query to get scoring runs with current schema fields
    scoringRuns: async () => {
      try {
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
        throw new Error('Failed to fetch scoring runs');
      }
    }
  }
};
