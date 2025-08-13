#!/usr/bin/env ts-node

import { validatorQueue } from './validatorQueue';
import { redis } from '../lib/redis';
import pino from 'pino';

const logger = pino({ 
  name: 'monitor', 
  level: 'info',
  transport: { target: 'pino-pretty' }
});

/**
 * Queue Monitoring Script
 * 
 * This script provides real-time monitoring of the validator queue:
 * - Queue statistics
 * - Job status
 * - Redis keys inspection
 * - Real-time job processing
 */

async function monitorQueue() {
  try {
    logger.info('📊 Validator Queue Monitor');
    logger.info('==========================');

    // Get queue statistics
    const waiting = await validatorQueue.getWaiting();
    const active = await validatorQueue.getActive();
    const completed = await validatorQueue.getCompleted();
    const failed = await validatorQueue.getFailed();
    const delayed = await validatorQueue.getDelayed();

    logger.info('📈 Queue Statistics:');
    logger.info(`  Waiting: ${waiting.length}`);
    logger.info(`  Active: ${active.length}`);
    logger.info(`  Completed: ${completed.length}`);
    logger.info(`  Failed: ${failed.length}`);
    logger.info(`  Delayed: ${delayed.length}`);

    // Show recent jobs
    if (waiting.length > 0) {
      logger.info('\n⏳ Waiting Jobs:');
      waiting.slice(0, 5).forEach((job, index) => {
        logger.info(`  ${index + 1}. ${job.name} (ID: ${job.id}) - Added: ${new Date(job.timestamp).toLocaleString()}`);
      });
    }

    if (active.length > 0) {
      logger.info('\n🔄 Active Jobs:');
      active.forEach((job, index) => {
        logger.info(`  ${index + 1}. ${job.name} (ID: ${job.id}) - Started: ${new Date(job.processedOn || 0).toLocaleString()}`);
      });
    }

    if (completed.length > 0) {
      logger.info('\n✅ Recent Completed Jobs:');
      completed.slice(0, 5).forEach((job, index) => {
        logger.info(`  ${index + 1}. ${job.name} (ID: ${job.id}) - Completed: ${new Date(job.finishedOn || 0).toLocaleString()}`);
      });
    }

    if (failed.length > 0) {
      logger.info('\n❌ Recent Failed Jobs:');
      failed.slice(0, 5).forEach((job, index) => {
        logger.info(`  ${index + 1}. ${job.name} (ID: ${job.id}) - Failed: ${new Date(job.finishedOn || 0).toLocaleString()}`);
        if (job.failedReason) {
          logger.info(`     Reason: ${job.failedReason}`);
        }
      });
    }

    // Check Redis keys
    logger.info('\n🔍 Redis Keys Inspection:');
    try {
      const keys = await redis.keys('*validatorQueue*');
      logger.info(`  Found ${keys.length} Redis keys related to validatorQueue:`);
      keys.forEach((key, index) => {
        logger.info(`    ${index + 1}. ${key}`);
      });

      // Check specific queue lists
      try {
        const waitingList = await redis.llen('bull:validatorQueue:wait');
        const activeList = await redis.llen('bull:validatorQueue:active');
        const completedList = await redis.llen('bull:validatorQueue:completed');
        const failedList = await redis.llen('bull:validatorQueue:failed');
        const delayedList = await redis.llen('bull:validatorQueue:delayed');

        logger.info('\n📋 Redis List Lengths:');
        logger.info(`  Waiting: ${waitingList}`);
        logger.info(`  Active: ${activeList}`);
        logger.info(`  Completed: ${completedList}`);
        logger.info(`  Failed: ${failedList}`);
        logger.info(`  Delayed: ${delayedList}`);
      } catch (listError) {
        logger.warn({ 
          error: listError instanceof Error ? listError.message : 'Unknown error',
          stack: listError instanceof Error ? listError.stack : undefined
        }, '⚠️ Could not get Redis list lengths');
      }

    } catch (redisError) {
      logger.warn({ 
        error: redisError instanceof Error ? redisError.message : 'Unknown error',
        stack: redisError instanceof Error ? redisError.stack : undefined
      }, '⚠️ Could not inspect Redis keys');
    }

    // Show job details if any exist
    if (waiting.length > 0 || active.length > 0 || completed.length > 0) {
      logger.info('\n💡 To see detailed job information:');
      logger.info('  - Check Prisma Studio for database changes');
      logger.info('  - Run worker to process jobs: ts-node src/queues/worker.ts');
      logger.info('  - Add new jobs: ts-node src/queues/addJob.ts <jobType>');
    } else {
      logger.info('\n💡 No jobs found. Add a job with:');
      logger.info('  ts-node src/queues/addJob.ts fetch');
      logger.info('  ts-node src/queues/addJob.ts score');
    }

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, '❌ Failed to monitor queue');
  } finally {
    await validatorQueue.close();
    await redis.quit();
  }
}

// Run monitoring
if (require.main === module) {
  monitorQueue().catch((error) => {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Monitoring failed');
    process.exit(1);
  });
}

export { monitorQueue };
