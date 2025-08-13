import { Queue, Worker } from 'bullmq';
import { redis } from '../lib/redis';
import { fetchValidators } from '../workers/fetchValidators';
import { scoreAllValidatorsJob } from '../workers/scoringAllValidators';
import { prisma } from '../lib/prisma';
import pino from 'pino';

const logger = pino({
  name: 'validatorQueue',
  level: 'info',
  transport: { target: 'pino-pretty' }
});

// Helper function to ensure Prisma connection is ready
async function ensurePrismaConnection() {
  try {
    // Test the connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    logger.debug('✅ Prisma connection verified');
  } catch (error) {
    logger.warn({ error: error instanceof Error ? error.message : 'Unknown error' }, '⚠️ Prisma connection failed, attempting to reconnect...');
    
    try {
      // Force a reconnection
      await prisma.$disconnect();
      await prisma.$connect();
      
      // Test connection again
      await prisma.$queryRaw`SELECT 1`;
      logger.info('✅ Prisma reconnection successful');
    } catch (reconnectError) {
      logger.error({ 
        error: reconnectError instanceof Error ? reconnectError.message : 'Unknown error',
        originalError: error instanceof Error ? error.message : 'Unknown error'
      }, '❌ Prisma reconnection failed');
      throw new Error('Database connection unavailable');
    }
  }
}

// Helper function to create audit log entries
async function createAuditLog(action: string, actorId: string | null, metadata: any) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        actorId,
        metadata
      }
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to create audit log entry');
  }
}

// Create the main validator queue
export const validatorQueue = new Queue('validatorQueue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,           // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: { age: 24 * 60 * 60 * 1000 }, // Keep successful jobs for 24 hours
    removeOnFail: { age: 7 * 24 * 60 * 60 * 1000 }  // Keep failed jobs for 7 days
  }
});

// Create worker that processes jobs
export const validatorWorker = new Worker(
  'validatorQueue',
  async (job) => {
    const { name, data } = job;
    const jobContext = { 
      jobId: job.id, 
      jobName: name,
      timestamp: new Date().toISOString(),
      data 
    };
    
    logger.info(jobContext, `🚀 Processing job: ${name}`);

    try {
      // Ensure Prisma is connected before processing
      await ensurePrismaConnection();

      switch (name) {
        case 'fetch':
          logger.info(jobContext, '📥 Starting fetch validators job...');
          await fetchValidators();
          logger.info(jobContext, '✅ Fetch validators job completed successfully');
          break;

        case 'score':
          logger.info(jobContext, '🎯 Starting score validators job...');
          await scoreAllValidatorsJob();
          logger.info(jobContext, '✅ Score validators job completed successfully');
          break;

        default:
          throw new Error(`Unknown job type: ${name}`);
      }

      logger.info({ ...jobContext, success: true }, `🎉 Job ${name} completed successfully`);
      return { success: true, jobType: name, completedAt: new Date().toISOString() };

    } catch (error) {
      const errorContext = {
        ...jobContext,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        failedAt: new Date().toISOString()
      };
      
      logger.error(errorContext, `❌ Job ${name} failed`);
      
      // Create audit log entry for job failure
      try {
        await createAuditLog('JOB_FAILED', null, {
          jobId: job.id,
          jobName: name,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
      } catch (auditError) {
        logger.error({ auditError: auditError instanceof Error ? auditError.message : 'Unknown error' }, 'Failed to create audit log for job failure');
      }
      
      throw error; // Re-throw to trigger retry logic
    }
  },
  { 
    connection: redis,
    concurrency: 3, // Process up to 3 jobs simultaneously for better throughput
    maxStalledCount: 2, // Retry stalled jobs up to 2 times
    stalledInterval: 30000 // Check for stalled jobs every 30 seconds
  }
);

// Worker event handlers
validatorWorker.on('completed', (job) => {
  if (job) {
    logger.info({ 
      jobId: job.id, 
      jobName: job.name,
      duration: Date.now() - job.timestamp
    }, `✅ Job completed successfully`);
  }
});

// Worker ready event - verify database connection
validatorWorker.on('ready', async () => {
  logger.info('🚀 Worker ready, verifying database connection...');
  try {
    await ensurePrismaConnection();
    logger.info('✅ Database connection verified, worker ready to process jobs');
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, '❌ Database connection failed, worker may not function properly');
  }
});

validatorWorker.on('failed', (job, err) => {
  if (job) {
    logger.error({ 
      jobId: job.id, 
      jobName: job.name,
      error: err.message,
      attempts: job.attemptsMade
    }, `❌ Job failed`);
  }
});

validatorWorker.on('error', (err) => {
  logger.error({ error: err.message, stack: err.stack }, `💥 Worker error`);
});

validatorWorker.on('stalled', (jobId) => {
  logger.warn({ jobId }, `⚠️ Job stalled`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down worker gracefully...');
  try {
    await validatorWorker.close();
    await validatorQueue.close();
    await redis.quit();
    logger.info('✅ All connections closed successfully');
  } catch (error) {
    logger.error({ error }, '❌ Error during shutdown');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Shutting down worker gracefully...');
  try {
    await validatorWorker.close();
    await validatorQueue.close();
    await redis.quit();
    logger.info('✅ All connections closed successfully');
  } catch (error) {
    logger.error({ error }, '❌ Error during shutdown');
  }
  process.exit(0);
});

export default validatorWorker;
