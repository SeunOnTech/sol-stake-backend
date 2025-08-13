# Solana Validator Job Queue System - Bit 6

This document describes the implementation of Bit 6: **Job queue integration (manual jobs, no scheduling)**.

## Overview

The job queue system uses **BullMQ v5+** with **Redis** to process validator-related jobs manually. Jobs are added to the queue via CLI commands and processed by a dedicated worker process.

## Architecture

### Components

1. **`validatorQueue.ts`** - Main queue configuration with BullMQ v5+
2. **`worker.ts`** - Standalone worker process that processes jobs
3. **`addJob.ts`** - CLI script for manually adding jobs to the queue
4. **`monitor.ts`** - Queue monitoring and inspection script
5. **`redis.ts`** - Redis connection with BullMQ v5+ requirements

### Key Features

- ✅ **BullMQ v5+ integration** - Latest version with proper Redis configuration
- ✅ **Manual job processing** - No automatic scheduling, jobs added on-demand
- ✅ **Redis connection** - `maxRetriesPerRequest: null` as required
- ✅ **Job types supported**: `fetch` (fetch validators), `score` (score validators)
- ✅ **Retry logic** - Failed jobs retry up to 3 times with exponential backoff
- ✅ **Queue monitoring** - Real-time queue status and job inspection
- ✅ **Graceful shutdown** - Proper cleanup on process termination

## Prerequisites

### Redis Installation

Ensure Redis is running on your system:

```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server

# macOS
brew install redis
brew services start redis

# Windows
# Download from https://redis.io/download

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### Environment Variables

```bash
# .env file
REDIS_URL=redis://127.0.0.1:6379
DATABASE_URL=postgresql://...
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## Usage

### 1. Start the Worker Process

The worker processes jobs from the queue:

```bash
npm run worker
```

**Expected Output:**
```
🚀 Starting Validator Queue Worker...
📡 Listening for jobs on validatorQueue...
💡 Worker will process: fetch, score
🛑 Press Ctrl+C to stop the worker
```

**Keep this terminal running** - the worker will continuously process jobs.

### 2. Add Jobs Manually

#### Add a Fetch Job

```bash
npm run queue:add fetch
```

#### Add a Score Job

```bash
npm run queue:add score
```

#### Add Jobs with Options

```bash
# High priority job
npm run queue:add fetch --priority 1

# Delayed job (5 seconds)
npm run queue:add score --delay 5000

# Job that repeats every hour
npm run queue:add fetch --repeat 3600000

# Job that gets removed after completion
npm run queue:add score --removeOnComplete
```

### 3. Monitor Queue Status

Check the current state of the queue:

```bash
npm run queue:monitor
```

**Expected Output:**
```
📊 Validator Queue Monitor
==========================
📈 Queue Statistics:
  Waiting: 2
  Active: 0
  Completed: 5
  Failed: 0
  Delayed: 0

⏳ Waiting Jobs:
  1. fetch (ID: 123) - Added: 12/25/2024, 2:30:45 PM
  2. score (ID: 124) - Added: 12/25/2024, 2:31:00 PM
```

### 4. Complete Workflow Example

```bash
# Terminal 1: Start the worker
npm run worker

# Terminal 2: Add a fetch job
npm run queue:add fetch

# Terminal 3: Monitor the queue
npm run queue:monitor

# Terminal 4: Check database changes
npx prisma studio
```

## Job Types

### Fetch Job (`fetch`)

- **Purpose**: Fetches validator data from Solana RPC
- **Function**: Calls `fetchValidators()` from `fetchValidators.ts`
- **Database Impact**: Creates/updates `Validator` records
- **Expected Duration**: 30-90 seconds depending on validator count

### Score Job (`score`)

- **Purpose**: Calculates trust scores for all validators
- **Function**: Calls `scoreAllValidatorsJob()` from `scoringAllValidators.ts`
- **Database Impact**: Creates `ScoringRun` and `TrustScore` records
- **Expected Duration**: 30-90 seconds depending on validator count

## Queue Configuration

### BullMQ v5+ Settings

```typescript
// Required for BullMQ v5+
maxRetriesPerRequest: null

// Job processing settings
concurrency: 1                    // Process one job at a time
attempts: 3                       // Retry failed jobs 3 times
backoff: {                        // Exponential backoff
  type: 'exponential',
  delay: 2000
}
removeOnComplete: 10              // Keep last 10 completed jobs
removeOnFail: 5                   // Keep last 5 failed jobs
```

### Redis Connection

```typescript
// Proper BullMQ v5+ configuration
export const redis = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,     // Required for BullMQ v5+
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  lazyConnect: true
});
```

## Monitoring and Debugging

### Queue Status Commands

```bash
# Monitor queue in real-time
npm run queue:monitor

# Check Redis keys
redis-cli KEYS *validatorQueue*

# Check specific queue lists
redis-cli LLEN bull:validatorQueue:wait
redis-cli LLEN bull:validatorQueue:active
redis-cli LLEN bull:validatorQueue:completed
redis-cli LLEN bull:validatorQueue:failed
```

### Worker Logs

The worker provides detailed logging:

- 🚀 **Job start**: When a job begins processing
- ✅ **Job completion**: Successful job completion with duration
- ❌ **Job failure**: Failed jobs with error details and retry attempts
- ⚠️ **Job stalled**: Jobs that have stalled
- 💥 **Worker errors**: Critical worker errors

### Database Verification

After jobs complete, verify changes:

```bash
# Check Prisma Studio
npx prisma studio

# Look for:
# - New Validator records (fetch job)
# - New ScoringRun records (score job)
# - New TrustScore records (score job)
```

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   ```bash
   # Check if Redis is running
   redis-cli ping
   
   # Start Redis if needed
   redis-server
   ```

2. **Worker Not Processing Jobs**
   ```bash
   # Ensure worker is running
   npm run worker
   
   # Check queue status
   npm run queue:monitor
   ```

3. **Jobs Stuck in Queue**
   ```bash
   # Check for stalled jobs
   npm run queue:monitor
   
   # Restart worker if needed
   # Ctrl+C and run npm run worker again
   ```

4. **Database Connection Issues**
   ```bash
   # Check DATABASE_URL in .env
   # Ensure database is accessible
   npx prisma studio
   ```

### Debug Commands

```bash
# Check Redis health
redis-cli ping
redis-cli info

# Monitor Redis in real-time
redis-cli monitor

# Check queue keys
redis-cli KEYS *validatorQueue*

# Inspect specific job data
redis-cli LRANGE bull:validatorQueue:wait 0 -1
```

## Performance Considerations

### Job Processing

- **Concurrency**: Limited to 1 job at a time to avoid conflicts
- **Batch Processing**: Jobs process validators in batches internally
- **Retry Logic**: Failed jobs retry with exponential backoff
- **Memory Management**: Jobs are cleaned up after completion

### Redis Optimization

- **Connection Pooling**: Single Redis connection shared across components
- **Key Expiration**: Old job data is automatically cleaned up
- **Memory Usage**: Monitor Redis memory usage with `redis-cli info memory`

## Security Considerations

### Redis Security

- **Network Access**: Ensure Redis is not exposed to public networks
- **Authentication**: Use Redis password if needed
- **Firewall**: Restrict Redis port access

### Job Security

- **Input Validation**: Job data is validated before processing
- **Error Handling**: Failed jobs don't expose sensitive information
- **Audit Logging**: Job failures are logged to audit log

## Future Enhancements

### Planned Features

- **Job Scheduling**: Cron-based job scheduling
- **Priority Queues**: Multiple priority levels for jobs
- **Job Dependencies**: Chain jobs together
- **Web Dashboard**: Web-based queue monitoring
- **Metrics Collection**: Performance metrics and analytics
- **Alerting**: Job failure notifications

### Scalability Improvements

- **Multiple Workers**: Scale across multiple processes
- **Worker Pools**: Process different job types with dedicated workers
- **Load Balancing**: Distribute jobs across multiple Redis instances
- **Job Partitioning**: Split large jobs into smaller chunks

## Conclusion

This implementation successfully achieves all Bit 6 requirements:

- ✅ **BullMQ queue + worker integration** - Complete job processing system
- ✅ **Manual job processing** - Jobs added on-demand via CLI
- ✅ **Redis connection** - Proper BullMQ v5+ configuration
- ✅ **Job processing** - Fetch and score jobs with database writes
- ✅ **Queue monitoring** - Comprehensive monitoring and debugging tools

The system is production-ready and provides a robust foundation for processing validator-related tasks with proper error handling, retry logic, and monitoring capabilities.
