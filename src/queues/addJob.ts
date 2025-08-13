#!/usr/bin/env ts-node

import { validatorQueue } from './validatorQueue';
import { redis } from '../lib/redis';
import pino from 'pino';

const logger = pino({ 
  name: 'addJob', 
  level: 'info',
  transport: { target: 'pino-pretty' }
});

/**
 * CLI script to manually add jobs to the validator queue
 * Usage: ts-node src/queues/addJob.ts <jobType> [options]
 * 
 * Examples:
 *   ts-node src/queues/addJob.ts fetch
 *   ts-node src/queues/addJob.ts score
 *   ts-node src/queues/addJob.ts fetch --priority 1
 *   ts-node src/queues/addJob.ts score --delay 5000
 */

async function addJob() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔧 Validator Queue Job Manager

Usage: ts-node src/queues/addJob.ts <jobType> [options]

Job Types:
  fetch  - Fetch validators from Solana RPC
  score  - Score all validators using v1 formula

Options:
  --priority <number>  - Job priority (higher = more important)
  --delay <ms>        - Delay job execution by milliseconds
  --repeat <ms>       - Repeat job every milliseconds
  --removeOnComplete  - Remove job after completion
  --removeOnFail      - Remove job after failure

Examples:
  ts-node src/queues/addJob.ts fetch
  ts-node src/queues/addJob.ts score --priority 1
  ts-node src/queues/addJob.ts fetch --delay 10000
  ts-node src/queues/addJob.ts score --repeat 3600000
`);
    process.exit(0);
  }

  const jobType = args[0];
  
  if (!['fetch', 'score'].includes(jobType)) {
    logger.error({ jobType }, `❌ Invalid job type: ${jobType}. Must be 'fetch' or 'score'`);
    process.exit(1);
  }

  // Parse options
  const options: any = {};
  for (let i = 1; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    
    if (!value) {
      logger.warn({ flag }, `⚠️ Missing value for flag: ${flag}`);
      continue;
    }
    
    switch (flag) {
      case '--priority':
        options.priority = parseInt(value);
        if (isNaN(options.priority)) {
          logger.warn({ value }, `⚠️ Invalid priority value: ${value}`);
          delete options.priority;
        }
        break;
      case '--delay':
        options.delay = parseInt(value);
        if (isNaN(options.delay)) {
          logger.warn({ value }, `⚠️ Invalid delay value: ${value}`);
          delete options.delay;
        }
        break;
      case '--repeat':
        const repeatValue = parseInt(value);
        if (isNaN(repeatValue)) {
          logger.warn({ value }, `⚠️ Invalid repeat value: ${value}`);
        } else {
          options.repeat = { every: repeatValue };
        }
        break;
      case '--removeOnComplete':
        options.removeOnComplete = true;
        break;
      case '--removeOnFail':
        options.removeOnFail = true;
        break;
      default:
        logger.warn({ flag }, `⚠️ Unknown option: ${flag}`);
    }
  }

  try {
    logger.info({ options }, `🚀 Adding ${jobType} job to queue...`);
    
    const job = await validatorQueue.add(jobType, {}, options);
    
    logger.info({
      jobId: job.id,
      jobType,
      options,
      queueSize: await validatorQueue.count()
    }, `✅ Job added successfully!`);

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
    }, `📊 Queue Status:`);

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, '❌ Failed to add job to queue');
    process.exit(1);
  } finally {
    await validatorQueue.close();
    await redis.quit();
    process.exit(0);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  addJob().catch((error) => {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Script failed');
    process.exit(1);
  });
}

export { addJob };
