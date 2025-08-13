# 🔍 Bit 8 - Observability & Housekeeping

## 🎯 **Goal**
Make logs and metrics useful and avoid DB/Redis bloat through comprehensive monitoring, structured logging, and automated cleanup.

## ✨ **Features Implemented**

### **1. Enhanced Structured Logging**
- **Job Context**: Every log entry includes job ID, job name, timestamp, and phase
- **Validator Context**: Scoring logs include validator ID and public key for traceability
- **Phase Tracking**: Logs track job phases (started, processing, completed, failed)
- **Progress Metrics**: Real-time success rates and processing statistics

### **2. Audit Logging System**
- **Job Failures**: Automatic logging of failed jobs with error details
- **Structured Data**: Consistent format for monitoring and alerting
- **Error Context**: Full error messages and stack traces for debugging

### **3. Prometheus Metrics Export**
- **Queue Metrics**: Waiting, active, completed, failed, delayed job counts
- **Job Performance**: Total executions, error rates, average durations
- **Database Metrics**: Validator counts, trust scores, scoring runs
- **Redis Health**: Connection status and memory usage

### **4. Redis Cleanup & Safety**
- **Automatic Cleanup**: `removeOnComplete` and `removeOnFail` with configurable retention
- **Memory Management**: Prevents unbounded Redis key accumulation
- **Configurable Retention**: Different policies for successful vs failed jobs

### **5. Worker Concurrency Control**
- **Optimized Concurrency**: Set to 3 jobs simultaneously for better throughput
- **Stalled Job Handling**: Automatic retry of stalled jobs with configurable limits
- **Resource Management**: Prevents overwhelming the system

## 🚀 **Usage**

### **Metrics Commands**

```bash
# View comprehensive metrics summary
npm run metrics:summary

# Export Prometheus metrics
npm run metrics:prometheus

# Perform system health check
npm run metrics:health

# General metrics (defaults to summary)
npm run metrics
```

### **Enhanced Logging Examples**

#### **Job Start Log**
```json
{
  "level": 30,
  "time": "2024-08-13T07:58:07.929Z",
  "pid": 26364,
  "hostname": "host",
  "name": "validatorQueue",
  "jobId": "repeat:5adba9eaa101305ba46ed3d0e6299c9f:1755096960000",
  "jobName": "fetch",
  "timestamp": "2024-08-13T07:58:07.929Z",
  "data": {},
  "msg": "🚀 Processing job: fetch"
}
```

#### **Validator Processing Log**
```json
{
  "level": 30,
  "time": "2024-08-13T07:58:08.000Z",
  "pid": 26364,
  "hostname": "host",
  "name": "scoringAllValidators",
  "jobType": "score",
  "timestamp": "2024-08-13T07:58:08.000Z",
  "phase": "validator-processing",
  "batchNumber": 1,
  "totalBatches": 5,
  "batchSize": 50,
  "validatorId": "clx123abc",
  "validatorPubkey": "ABC123...",
  "progress": "150/250",
  "successRate": "98.7%",
  "msg": "✅ Processed 150/250 validators"
}
```

#### **Job Completion Log**
```json
{
  "level": 30,
  "time": "2024-08-13T07:58:30.000Z",
  "pid": 26364,
  "hostname": "host",
  "name": "scoringAllValidators",
  "jobType": "score",
  "timestamp": "2024-08-13T07:58:30.000Z",
  "phase": "completed",
  "successCount": 245,
  "failCount": 5,
  "scoringRunId": "clx456def",
  "totalDuration": "22.5s",
  "avgTimePerValidator": "90.0ms",
  "successRate": "98.0%",
  "msg": "🎯 Scoring job completed successfully!"
}
```

## 📊 **Metrics Dashboard**

### **System Health Indicators**

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Queue Failed Jobs | 0 | 1-5 | >5 |
| Job Error Rate | <5% | 5-10% | >10% |
| Queue Backlog | <10 | 10-50 | >50 |
| Redis Connection | Connected | - | Disconnected |
| Database Validators | >0 | 0 | 0 |

### **Performance Metrics**

- **Job Throughput**: Jobs processed per minute
- **Average Duration**: Time per job execution
- **Success Rate**: Percentage of successful jobs
- **Error Patterns**: Common failure reasons

## 🔧 **Configuration**

### **Queue Cleanup Settings**
```typescript
defaultJobOptions: {
  removeOnComplete: { age: 24 * 60 * 60 * 1000 }, // 24 hours
  removeOnFail: { age: 7 * 24 * 60 * 60 * 1000 }  // 7 days
}
```

### **Worker Concurrency**
```typescript
{
  concurrency: 3,           // Process 3 jobs simultaneously
  maxStalledCount: 2,       // Retry stalled jobs up to 2 times
  stalledInterval: 30000    // Check for stalled jobs every 30 seconds
}
```

### **Logging Levels**
```typescript
const logger = pino({
  name: 'component-name',
  level: 'info',           // info, warn, error
  transport: { target: 'pino-pretty' }
});
```

## 🚨 **Alerting & Monitoring**

### **Critical Alerts**
- **Job Failures**: High error rates (>10%)
- **Queue Backlog**: Excessive waiting jobs (>50)
- **Redis Disconnection**: Connection failures
- **Database Issues**: No validators or trust scores

### **Warning Alerts**
- **Moderate Errors**: Error rates 5-10%
- **Queue Delays**: Jobs waiting >10 minutes
- **Memory Usage**: High Redis memory consumption

### **Monitoring Commands**
```bash
# Quick health check
npm run metrics:health

# Detailed metrics
npm run metrics:summary

# Prometheus export for monitoring systems
npm run metrics:prometheus
```

## 🧹 **Housekeeping Features**

### **Automatic Cleanup**
- **Successful Jobs**: Removed after 24 hours
- **Failed Jobs**: Removed after 7 days
- **Repeatable Jobs**: Configurable retention policies
- **Redis Keys**: Automatic expiration prevents bloat

### **Manual Cleanup**
```bash
# Remove all repeatable jobs
npm run queue:scheduler remove

# Monitor queue status
npm run queue:monitor

# Check Redis memory usage
npm run metrics:summary
```

## 📈 **Performance Optimization**

### **Batch Processing**
- **Scoring Jobs**: Process validators in batches of 50
- **Concurrent Processing**: Parallel execution within batches
- **Rate Limiting**: Small delays between batches to prevent DB overload

### **Resource Management**
- **Worker Concurrency**: Optimized for system resources
- **Memory Usage**: Configurable job retention policies
- **Database Connections**: Efficient Prisma usage patterns

## 🔍 **Troubleshooting**

### **Common Issues**

#### **High Error Rates**
```bash
# Check job failures
npm run queue:monitor

# Review worker logs
npm run worker

# Analyze error patterns
npm run metrics:summary
```

#### **Redis Memory Issues**
```bash
# Check Redis health
npm run metrics:health

# Monitor memory usage
npm run metrics:summary

# Clean up old jobs
npm run queue:scheduler remove
```

#### **Queue Backlog**
```bash
# Check queue status
npm run queue:monitor

# Verify worker is running
npm run worker

# Check for stuck jobs
npm run metrics:health
```

### **Debug Commands**
```bash
# View detailed metrics
npm run metrics:summary

# Export for analysis
npm run metrics:prometheus > metrics.txt

# Health check with recommendations
npm run metrics:health
```

## 🚀 **Production Deployment**

### **Monitoring Setup**
1. **Metrics Collection**: Run metrics collection every 5 minutes
2. **Health Checks**: Monitor system health every minute
3. **Alerting**: Configure alerts for critical metrics
4. **Log Aggregation**: Centralize logs for analysis

### **Performance Tuning**
1. **Concurrency**: Adjust based on system resources
2. **Batch Sizes**: Optimize for database performance
3. **Retention Policies**: Balance storage vs monitoring needs
4. **Log Levels**: Use appropriate levels for production

### **Scaling Considerations**
- **Multiple Workers**: Deploy multiple worker instances
- **Queue Partitioning**: Separate queues for different job types
- **Database Optimization**: Index optimization for large datasets
- **Redis Clustering**: High availability Redis setup

## 📚 **API Reference**

### **Metrics Functions**
```typescript
// Collect all system metrics
collectSystemMetrics(): Promise<SystemMetrics>

// Get job-specific metrics
collectJobMetrics(jobType: string): Promise<JobMetrics>

// Format for Prometheus
formatPrometheusMetrics(metrics: SystemMetrics): string

// Log metrics summary
logMetricsSummary(metrics: SystemMetrics): void
```

### **Health Check Functions**
```typescript
// Perform system health check
checkSystemHealth(): Promise<void>

// Check Redis health
checkRedisHealth(): Promise<{ connected: boolean; memoryUsage: number | null }>
```

## 🎯 **Success Criteria**

### **✅ Acceptance Criteria Met**
- [x] **Logs include timestamps and job context**
- [x] **Redis does not accumulate unbounded job keys**
- [x] **Logs + metrics allow determination of job failures**
- [x] **Worker processes jobs with proper concurrency**
- [x] **Failed jobs are logged to audit log**

### **📊 Verification Results**
- **Structured Logging**: ✅ Implemented with full context
- **Metrics Collection**: ✅ Comprehensive system monitoring
- **Redis Cleanup**: ✅ Automatic job retention policies
- **Worker Safety**: ✅ Concurrency control and error handling
- **Audit Logging**: ✅ Job failure tracking and alerting

## 🔮 **Future Enhancements**

### **Advanced Monitoring**
- **Real-time Dashboards**: Web-based monitoring interface
- **Custom Alerts**: Configurable alerting rules
- **Performance Profiling**: Detailed job execution analysis
- **Trend Analysis**: Historical performance tracking

### **Integration Features**
- **Grafana Dashboards**: Pre-built monitoring dashboards
- **Slack/Email Alerts**: Notification integration
- **API Endpoints**: REST API for metrics access
- **Webhook Support**: External system integration

---

**🎉 Bit 8 Complete!** The system now has production-ready observability, comprehensive monitoring, and automated housekeeping to prevent resource bloat.
