#!/usr/bin/env ts-node

import { validatorQueue } from './validatorQueue';
import { redis } from '../lib/redis';
import pino from 'pino';

const logger = pino({ 
  name: 'scheduler', 
  level: 'info',
  transport: { target: 'pino-pretty' }
});

/**
 * Job Scheduler for Repeatable Jobs
 * 
 * This script sets up repeatable jobs for the validator queue:
 * - fetch: Fetches validator data from Solana RPC
 * - score: Calculates trust scores for all validators
 * 
 * Testing Mode: 10-second intervals
 * Production Mode: 6-hour intervals
 */

interface SchedulerConfig {
  mode: 'test' | 'production';
  fetchInterval: number;
  scoreInterval: number;
  removeOnComplete: boolean | { age: number };
  removeOnFail: boolean | { age: number };
}

const TEST_CONFIG: SchedulerConfig = {
  mode: 'test',
  fetchInterval: 30_000, // 30 seconds (Bit 9 requirement)
  scoreInterval: 60_000, // 60 seconds (allows fetch to complete first)
  removeOnComplete: { age: 60 * 60 * 1000 }, // Keep for 1 hour
  removeOnFail: { age: 24 * 60 * 60 * 1000 } // Keep failed jobs for 24 hours
};

const PRODUCTION_CONFIG: SchedulerConfig = {
  mode: 'production',
  fetchInterval: 6 * 60 * 60 * 1000, // 6 hours
  scoreInterval: 6 * 60 * 60 * 1000, // 6 hours
  removeOnComplete: { age: 7 * 24 * 60 * 60 * 1000 }, // Keep for 7 days
  removeOnFail: { age: 30 * 24 * 60 * 60 * 1000 } // Keep failed jobs for 30 days
};

async function setupRepeatableJobs(config: SchedulerConfig) {
  try {
    logger.info(`🚀 Setting up repeatable jobs in ${config.mode} mode`);
    logger.info({
      fetchInterval: `${config.fetchInterval / 1000}s`,
      scoreInterval: `${config.scoreInterval / 1000}s`,
      removeOnComplete: config.removeOnComplete,
      removeOnFail: config.removeOnFail
    }, `📊 Configuration`);

    // Clear existing repeatable jobs to avoid conflicts
    logger.info('🧹 Clearing existing repeatable jobs...');
    const repeatableJobs = await validatorQueue.getRepeatableJobs();
    
    for (const job of repeatableJobs) {
      if (job.id === 'fetch-repeatable' || job.id === 'score-repeatable') {
        await validatorQueue.removeRepeatableByKey(job.key);
        logger.info(`🗑️ Removed existing repeatable job: ${job.id}`);
      }
    }

    // Add repeatable fetch job
    logger.info('📥 Adding repeatable fetch job...');
    await validatorQueue.add('fetch', {}, {
      jobId: 'fetch-repeatable',
      repeat: { every: config.fetchInterval },
      removeOnComplete: config.removeOnComplete,
      removeOnFail: config.removeOnFail,
      priority: 1 // High priority for data freshness
    });
    logger.info(`✅ Added repeatable fetch job (every ${config.fetchInterval / 1000}s)`);

    // Add repeatable score job
    logger.info('📥 Adding repeatable score job...');
    await validatorQueue.add('score', {}, {
      jobId: 'score-repeatable',
      repeat: { every: config.scoreInterval },
      removeOnComplete: config.removeOnComplete,
      removeOnFail: config.removeOnFail,
      priority: 2 // Lower priority than fetch
    });
    logger.info(`✅ Added repeatable score job (every ${config.scoreInterval / 1000}s)`);

    // Verify repeatable jobs
    const newRepeatableJobs = await validatorQueue.getRepeatableJobs();
    logger.info(`📋 Current repeatable jobs: ${newRepeatableJobs.length}`);
    
    newRepeatableJobs.forEach(job => {
      if (job.every && typeof job.every === 'number') {
        logger.info(`  - ${job.id}: every ${job.every / 1000}s`);
      } else {
        logger.info(`  - ${job.id}: every N/A`);
      }
    });

    // Show queue status
    const waiting = await validatorQueue.getWaiting();
    const active = await validatorQueue.getActive();
    const completed = await validatorQueue.getCompleted();
    const failed = await validatorQueue.getFailed();
    
    logger.info({
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    }, `📊 Queue Status`);

    logger.info(`🎯 Repeatable jobs setup complete!`);
    logger.info(`💡 Jobs will now run automatically every:`);
    logger.info(`   - Fetch: ${config.fetchInterval / 1000} seconds`);
    logger.info(`   - Score: ${config.scoreInterval / 1000} seconds`);

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, '❌ Failed to setup repeatable jobs');
    throw error;
  }
}

async function listRepeatableJobs() {
  try {
    logger.info('📋 Listing all repeatable jobs...');
    const repeatableJobs = await validatorQueue.getRepeatableJobs();
    
    if (repeatableJobs.length === 0) {
      logger.info('ℹ️ No repeatable jobs found');
      return;
    }

    logger.info(`Found ${repeatableJobs.length} repeatable jobs:`);
    repeatableJobs.forEach((job, index) => {
      logger.info(`  ${index + 1}. ${job.id || 'unnamed'}`);
      logger.info(`     Pattern: ${job.pattern}`);
      if (job.every && typeof job.every === 'number') {
        logger.info(`     Every: ${job.every / 1000}s`);
      } else {
        logger.info(`     Every: N/A`);
      }
      logger.info(`     Next: ${job.next ? new Date(job.next).toLocaleString() : 'N/A'}`);
      logger.info(`     Key: ${job.key}`);
      logger.info('');
    });

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, '❌ Failed to list repeatable jobs');
  }
}

async function removeRepeatableJobs() {
  try {
    logger.info('🗑️ Removing all repeatable jobs...');
    const repeatableJobs = await validatorQueue.getRepeatableJobs();
    
    for (const job of repeatableJobs) {
      await validatorQueue.removeRepeatableByKey(job.key);
      logger.info(`✅ Removed repeatable job: ${job.id || 'unnamed'}`);
    }

    logger.info('🎯 All repeatable jobs removed');

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, '❌ Failed to remove repeatable jobs');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'setup';
  const mode = args[1] || 'test';

  try {
    switch (command) {
      case 'setup':
        const config = mode === 'production' ? PRODUCTION_CONFIG : TEST_CONFIG;
        await setupRepeatableJobs(config);
        break;
        
      case 'list':
        await listRepeatableJobs();
        break;
        
      case 'remove':
        await removeRepeatableJobs();
        break;
        
      case 'help':
        console.log(`
🔧 Job Scheduler for Repeatable Jobs

Usage: ts-node src/queues/scheduler.ts [command] [mode]

Commands:
  setup   - Setup repeatable jobs (default)
  list    - List all repeatable jobs
  remove  - Remove all repeatable jobs
  help    - Show this help message

Modes:
  test       - 10s fetch, 30s score intervals (default)
  production - 6h intervals for both jobs

Examples:
  ts-node src/queues/scheduler.ts setup test
  ts-node src/queues/scheduler.ts setup production
  ts-node src/queues/scheduler.ts list
  ts-node src/queues/scheduler.ts remove
        `);
        break;
        
      default:
        logger.error(`❌ Unknown command: ${command}`);
        logger.info('💡 Use "help" command to see available options');
        process.exit(1);
    }

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Scheduler failed');
    process.exit(1);
  } finally {
    await validatorQueue.close();
    // Don't close Redis connection - it's shared with the worker
    // await redis.quit();
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Scheduler failed');
    process.exit(1);
  });
}

export { setupRepeatableJobs, listRepeatableJobs, removeRepeatableJobs, TEST_CONFIG, PRODUCTION_CONFIG };
