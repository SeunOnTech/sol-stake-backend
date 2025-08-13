import { prisma } from '../lib/prisma';
import { scoreAllValidatorsJob } from './scoringAllValidators';
import pino from 'pino';

const logger = pino({ 
  name: 'testScoring', 
  level: 'info',
  transport: { target: 'pino-pretty' }
});

/**
 * Test script to verify scoring functionality
 */
async function testScoring() {
  logger.info('🧪 Starting scoring test...');

  try {
    // Check if we have validators in the database
    const validatorCount = await prisma.validator.count();
    logger.info(`📊 Found ${validatorCount} validators in database`);

    if (validatorCount === 0) {
      logger.warn('⚠️ No validators found. Please run fetchValidators first.');
      return;
    }

    // Check existing scoring runs
    const existingRuns = await prisma.scoringRun.count();
    logger.info(`🔄 Found ${existingRuns} existing scoring runs`);

    // Run the scoring job
    await scoreAllValidatorsJob();

    // Verify results
    const newRunCount = await prisma.scoringRun.count();
    const newTrustScores = await prisma.trustScore.count();
    
    logger.info(`✅ Test completed successfully!`);
    logger.info(`🆔 New scoring runs: ${newRunCount - existingRuns}`);
    logger.info(`📈 Total trust scores: ${newTrustScores}`);
    
    // Show some sample scores
    const recentScores = await prisma.trustScore.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        validator: {
          select: { validatorPubkey: true, uptime: true, commission: true }
        }
      }
    });

    logger.info('📋 Sample recent scores:');
    recentScores.forEach((score, index) => {
      logger.info(`  ${index + 1}. Validator: ${score.validator.validatorPubkey.slice(0, 8)}...`);
      logger.info(`     Score: ${score.score}, Uptime: ${score.validator.uptime}, Commission: ${score.validator.commission ?? 'N/A'}`);
    });

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, '❌ Test failed');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testScoring().catch((error) => {
    logger.error('Test failed');
    process.exit(1);
  });
}
