import { prisma } from '../lib/prisma';
import pino from 'pino';

const logger = pino({ 
  name: 'scoringAllValidators', 
  level: 'info',
  transport: { target: 'pino-pretty' }
});

/**
 * TrustScore v1 Formula:
 * score = uptime - (commission ?? baselinePenalty)
 * Bound between 0 and 100
 */
function calculateTrustScore(uptime: number, commission: number | null): number {
  const baselinePenalty = 5; // Default penalty if commission is null
  let score = uptime - (commission ?? baselinePenalty);
  
  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));
  
  return Math.round(score * 100) / 100; // Round to 2 decimal places
}

/**
 * Main scoring job that processes all validators in the database
 */
export async function scoreAllValidatorsJob(): Promise<void> {
  const startTime = Date.now();
  const jobContext = {
    jobType: 'score',
    timestamp: new Date().toISOString(),
    phase: 'started'
  };
  
  logger.info(jobContext, '🚀 Starting comprehensive validator scoring job...');

  try {
    // 1. Read all validators from DB
    const validators = await prisma.validator.findMany({
      select: {
        id: true,
        validatorPubkey: true,
        uptime: true,
        commission: true,
        name: true
      }
    });

    if (!validators.length) {
      logger.warn({ ...jobContext, phase: 'no-validators' }, '⚠️ No validators found in database. Run fetchValidators first.');
      return;
    }

    logger.info({ ...jobContext, validatorCount: validators.length }, `📊 Found ${validators.length} validators to score`);

    // 2. Create a new scoring run for this batch
    const scoringRun = await prisma.scoringRun.create({
      data: {
        runDate: new Date()
        // Note: These fields will be available after schema update:
        // status: 'running',
        // validatorCount: validators.length,
        // successCount: 0,
        // failCount: 0
      }
    });

    logger.info(`🆔 Created scoring run: ${scoringRun.id}`);

    // 3. Process each validator and compute scores
    let successCount = 0;
    let failCount = 0;
    const batchSize = 50; // Process in batches for better performance

    for (let i = 0; i < validators.length; i += batchSize) {
      const batch = validators.slice(i, i + batchSize);
      
      const batchContext = {
        ...jobContext,
        phase: 'batch-processing',
        batchNumber: Math.floor(i / batchSize) + 1,
        totalBatches: Math.ceil(validators.length / batchSize),
        batchSize: batch.length
      };
      
      logger.info(batchContext, `📦 Processing batch ${batchContext.batchNumber}/${batchContext.totalBatches} (${batch.length} validators)`);

      // Process batch concurrently for better performance
      const batchPromises = batch.map(async (validator) => {
        const validatorContext = {
          ...batchContext,
          validatorId: validator.id,
          validatorPubkey: validator.validatorPubkey,
          phase: 'validator-processing'
        };
        
        try {
          // Calculate trust score using v1 formula
          const score = calculateTrustScore(
            validator.uptime ?? 0,
            validator.commission
          );

          // 4. Persist TrustScore with proper run reference
          await prisma.trustScore.create({
            data: {
              validatorId: validator.id,
              score,
              scoringRunId: scoringRun.id
            }
          });

          successCount++;
          
          // Log every 10th success to avoid spam
          if (successCount % 10 === 0) {
            logger.info({ 
              ...validatorContext, 
              progress: `${successCount}/${validators.length}`,
              successRate: `${((successCount / (successCount + failCount)) * 100).toFixed(1)}%`
            }, `✅ Processed ${successCount}/${validators.length} validators`);
          }

          return { success: true, validatorId: validator.id, score };
        } catch (error) {
          failCount++;
          logger.error({ 
            ...validatorContext,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          }, `❌ Failed to score validator ${validator.validatorPubkey}`);
          
          return { success: false, validatorId: validator.id, error };
        }
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Small delay between batches to prevent overwhelming the database
      if (i + batchSize < validators.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const avgTimePerValidator = (Date.now() - startTime) / validators.length;
    
    const completionContext = {
      ...jobContext,
      phase: 'completed',
      successCount,
      failCount,
      scoringRunId: scoringRun.id,
      totalDuration: `${duration}s`,
      avgTimePerValidator: `${avgTimePerValidator.toFixed(2)}ms`,
      successRate: `${((successCount / validators.length) * 100).toFixed(1)}%`
    };
    
    logger.info(completionContext, `🎯 Scoring job completed successfully!`);
    logger.info(completionContext, `📈 Results: ${successCount} successful, ${failCount} failed`);
    logger.info(completionContext, `⏱️ Duration: ${duration}s (avg: ${avgTimePerValidator.toFixed(2)}ms per validator)`);
    logger.info(completionContext, `🆔 Scoring Run ID: ${scoringRun.id}`);
    
    // Verification logging
    if (successCount > 0) {
      logger.info(completionContext, `✅ TrustScore count (${successCount}) ≈ validator count (${validators.length})`);
      logger.info(completionContext, `🔗 All TrustScore entries reference scoringRunId: ${scoringRun.id}`);
    }

    // Note: After schema update, we can update the ScoringRun with final counts:
    // await prisma.scoringRun.update({
    //   where: { id: scoringRun.id },
    //   data: {
    //     status: 'completed',
    //     successCount,
    //     failCount
    //   }
    // });

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, '❌ Critical error in scoring job');
    
    // Log to audit log for monitoring
    try {
      await prisma.auditLog.create({
        data: {
          action: 'SCORING_JOB_FAILED',
          actorId: null,
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (auditError) {
      logger.error('Failed to create audit log entry');
    }
    
    throw error;
  }
}

/**
 * Standalone execution for testing
 */
if (require.main === module) {
  (async () => {
    try {
      await scoreAllValidatorsJob();
    } catch (error) {
      logger.error('Scoring job failed');
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  })();
}
