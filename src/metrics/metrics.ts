import { validatorQueue } from '../queues/validatorQueue';
import { prisma } from '../lib/prisma';
import pino from 'pino';

const logger = pino({
  name: 'metrics',
  level: 'info',
  transport: { target: 'pino-pretty' }
});

/**
 * Metrics Collection System
 * 
 * Collects and exposes metrics for:
 * - Job execution counts
 * - Error rates
 * - Performance metrics
 * - System health
 */

export interface SystemMetrics {
  timestamp: string;
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  jobs: {
    fetch: {
      total: number;
      errors: number;
      successRate: number;
      avgDuration: number;
    };
    score: {
      total: number;
      errors: number;
      successRate: number;
      avgDuration: number;
    };
  };
  database: {
    validators: number;
    trustScores: number;
    scoringRuns: number;
    auditLogs: number;
  };
  redis: {
    connected: boolean;
    memoryUsage: number | null;
  };
}

export interface JobMetrics {
  jobType: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  lastExecution: string | null;
  errorRate: number;
}

/**
 * Collect comprehensive system metrics
 */
export async function collectSystemMetrics(): Promise<SystemMetrics> {
  try {
    const timestamp = new Date().toISOString();
    
    // Queue metrics
    const waiting = await validatorQueue.getWaiting().then(jobs => jobs.length);
    const active = await validatorQueue.getActive().then(jobs => jobs.length);
    const completed = await validatorQueue.getCompleted().then(jobs => jobs.length);
    const failed = await validatorQueue.getFailed().then(jobs => jobs.length);
    const delayed = await validatorQueue.getDelayed().then(jobs => jobs.length);

    // Database metrics
    const validators = await prisma.validator.count();
    const trustScores = await prisma.trustScore.count();
    const scoringRuns = await prisma.scoringRun.count();
    const auditLogs = await prisma.auditLog.count();

    // Job-specific metrics
    const fetchMetrics = await collectJobMetrics('fetch');
    const scoreMetrics = await collectJobMetrics('score');

    // Redis health check
    const redisHealth = await checkRedisHealth();

    const metrics: SystemMetrics = {
      timestamp,
      queue: { waiting, active, completed, failed, delayed },
      jobs: {
        fetch: {
          total: fetchMetrics.totalExecutions,
          errors: fetchMetrics.failedExecutions,
          successRate: fetchMetrics.errorRate,
          avgDuration: fetchMetrics.averageDuration
        },
        score: {
          total: scoreMetrics.totalExecutions,
          errors: scoreMetrics.failedExecutions,
          successRate: scoreMetrics.errorRate,
          avgDuration: scoreMetrics.averageDuration
        }
      },
      database: { validators, trustScores, scoringRuns, auditLogs },
      redis: redisHealth
    };

    logger.info({ metrics }, '📊 System metrics collected successfully');
    return metrics;

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, '❌ Failed to collect system metrics');
    
    // Return basic metrics on error
    return {
      timestamp: new Date().toISOString(),
      queue: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      jobs: {
        fetch: { total: 0, errors: 0, successRate: 0, avgDuration: 0 },
        score: { total: 0, errors: 0, successRate: 0, avgDuration: 0 }
      },
      database: { validators: 0, trustScores: 0, scoringRuns: 0, auditLogs: 0 },
      redis: { connected: false, memoryUsage: null }
    };
  }
}

/**
 * Collect metrics for a specific job type
 */
export async function collectJobMetrics(jobType: string): Promise<JobMetrics> {
  try {
    // Get completed jobs for this type
    const completedJobs = await validatorQueue.getCompleted();
    const failedJobs = await validatorQueue.getFailed();
    
    const typeCompletedJobs = completedJobs.filter(job => job.name === jobType);
    const typeFailedJobs = failedJobs.filter(job => job.name === jobType);
    
    const totalExecutions = typeCompletedJobs.length + typeFailedJobs.length;
    const successfulExecutions = typeCompletedJobs.length;
    const failedExecutions = typeFailedJobs.length;
    
    // Calculate average duration from completed jobs
    let totalDuration = 0;
    let validDurations = 0;
    
    typeCompletedJobs.forEach(job => {
      if (job.processedOn && job.finishedOn) {
        totalDuration += (job.finishedOn - job.processedOn);
        validDurations++;
      }
    });
    
    const averageDuration = validDurations > 0 ? totalDuration / validDurations : 0;
    const errorRate = totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0;
    
    // Get last execution time
    const lastExecution = typeCompletedJobs.length > 0 
      ? new Date(Math.max(...typeCompletedJobs.map(job => job.finishedOn || 0))).toISOString()
      : null;

    return {
      jobType,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageDuration,
      lastExecution,
      errorRate
    };

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      jobType 
    }, '❌ Failed to collect job metrics');
    
    return {
      jobType,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageDuration: 0,
      lastExecution: null,
      errorRate: 0
    };
  }
}

/**
 * Check Redis health and memory usage
 */
async function checkRedisHealth(): Promise<{ connected: boolean; memoryUsage: number | null }> {
  try {
    // Use the shared Redis connection instead of trying to access queue connection
    const { redis } = await import('../lib/redis');
    const info = await redis.info('memory');
    const memoryMatch = info.match(/used_memory_human:(\d+)/);
    const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : null;
    
    return {
      connected: true,
      memoryUsage
    };
  } catch (error) {
    logger.warn({ error: error instanceof Error ? error.message : 'Unknown error' }, '⚠️ Redis health check failed');
    return {
      connected: false,
      memoryUsage: null
    };
  }
}

/**
 * Get metrics in Prometheus format (optional)
 */
export function formatPrometheusMetrics(metrics: SystemMetrics): string {
  const lines: string[] = [];
  
  // Queue metrics
  lines.push(`# HELP validator_queue_waiting_jobs Number of jobs waiting in queue`);
  lines.push(`# TYPE validator_queue_waiting_jobs gauge`);
  lines.push(`validator_queue_waiting_jobs ${metrics.queue.waiting}`);
  
  lines.push(`# HELP validator_queue_active_jobs Number of jobs currently being processed`);
  lines.push(`# TYPE validator_queue_active_jobs gauge`);
  lines.push(`validator_queue_active_jobs ${metrics.queue.active}`);
  
  lines.push(`# HELP validator_queue_completed_jobs Total number of completed jobs`);
  lines.push(`# TYPE validator_queue_completed_jobs counter`);
  lines.push(`validator_queue_completed_jobs ${metrics.queue.completed}`);
  
  lines.push(`# HELP validator_queue_failed_jobs Total number of failed jobs`);
  lines.push(`# TYPE validator_queue_failed_jobs counter`);
  lines.push(`validator_queue_failed_jobs ${metrics.queue.failed}`);
  
  // Job-specific metrics
  lines.push(`# HELP validator_job_fetch_total Total number of fetch job executions`);
  lines.push(`# TYPE validator_job_fetch_total counter`);
  lines.push(`validator_job_fetch_total ${metrics.jobs.fetch.total}`);
  
  lines.push(`# HELP validator_job_fetch_errors Total number of fetch job errors`);
  lines.push(`# TYPE validator_job_fetch_errors counter`);
  lines.push(`validator_job_fetch_errors ${metrics.jobs.fetch.errors}`);
  
  lines.push(`# HELP validator_job_score_total Total number of score job executions`);
  lines.push(`# TYPE validator_job_score_total counter`);
  lines.push(`validator_job_score_total ${metrics.jobs.score.total}`);
  
  lines.push(`# HELP validator_job_score_errors Total number of score job errors`);
  lines.push(`# TYPE validator_job_score_errors counter`);
  lines.push(`validator_job_score_errors ${metrics.jobs.score.errors}`);
  
  // Database metrics
  lines.push(`# HELP validator_database_validators Total number of validators in database`);
  lines.push(`# TYPE validator_database_validators gauge`);
  lines.push(`validator_database_validators ${metrics.database.validators}`);
  
  lines.push(`# HELP validator_database_trust_scores Total number of trust scores in database`);
  lines.push(`# TYPE validator_database_trust_scores gauge`);
  lines.push(`validator_database_trust_scores ${metrics.database.trustScores}`);
  
  return lines.join('\n');
}

/**
 * Log metrics summary for monitoring
 */
export function logMetricsSummary(metrics: SystemMetrics) {
  logger.info({
    queue: metrics.queue,
    jobSuccessRates: {
      fetch: `${(100 - metrics.jobs.fetch.successRate).toFixed(1)}%`,
      score: `${(100 - metrics.jobs.score.successRate).toFixed(1)}%`
    },
    database: metrics.database,
    redis: metrics.redis.connected ? 'Connected' : 'Disconnected'
  }, '📊 Metrics Summary');
}

// Export default metrics collection function
export default collectSystemMetrics;
