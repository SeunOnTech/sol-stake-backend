#!/usr/bin/env ts-node

/**
 * Standalone Worker Process for Validator Queue
 * 
 * This file runs the worker that processes jobs from the validatorQueue.
 * Run with: ts-node src/queues/worker.ts
 * 
 * The worker will:
 * 1. Connect to Redis
 * 2. Listen for jobs on validatorQueue
 * 3. Process fetch and score jobs
 * 4. Handle job completion, failures, and retries
 */

import validatorWorker from './validatorQueue';
import pino from 'pino';

const logger = pino({ 
  name: 'worker', 
  level: 'info',
  transport: { target: 'pino-pretty' }
});

logger.info('🚀 Starting Validator Queue Worker...');
logger.info('📡 Listening for jobs on validatorQueue...');
logger.info('💡 Worker will process: fetch, score');
logger.info('🛑 Press Ctrl+C to stop the worker');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ 
    error: error.message, 
    stack: error.stack 
  }, '💥 Uncaught Exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ 
    reason, 
    promise 
  }, '💥 Unhandled Rejection');
  process.exit(1);
});

// Keep the process alive by setting up a simple interval
const keepAlive = setInterval(() => {
  // This keeps the process running
  // We could also use process.stdin.resume() but interval is more reliable
}, 1000);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Received SIGINT, shutting down gracefully...');
  clearInterval(keepAlive);
  try {
    await validatorWorker.close();
    logger.info('✅ Worker closed successfully');
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, '❌ Error closing worker');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Received SIGTERM, shutting down gracefully...');
  clearInterval(keepAlive);
  try {
    await validatorWorker.close();
    logger.info('✅ Worker closed successfully');
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, '❌ Error closing worker');
  }
  process.exit(0);
});

// Export for testing
export { validatorWorker };
