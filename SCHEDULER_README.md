# 🔄 Bit 7 - Repeatable Job Scheduling

## 📋 Overview

Bit 7 implements automated job scheduling for the Solana staking backend. Instead of manually adding jobs, the system now runs fetch and score jobs automatically at configurable intervals.

## 🎯 Goals

- **Automated Execution:** Jobs run automatically without manual intervention
- **Configurable Intervals:** Easy switching between test (10s/30s) and production (6h) modes
- **Storage Management:** Automatic cleanup of old job data
- **Duplicate Prevention:** Unique job IDs prevent multiple schedules

## 🏗️ Architecture

### **Components**

1. **Job Scheduler** (`src/queues/scheduler.ts`)
   - Sets up repeatable jobs with unique IDs
   - Manages test vs production configurations
   - Handles job cleanup and storage limits

2. **Configuration Modes**
   - **Test Mode:** 10s fetch, 30s score intervals
   - **Production Mode:** 6h intervals for both jobs

3. **Storage Limits**
   - `removeOnComplete`: Automatic cleanup of successful jobs
   - `removeOnFail`: Retention of failed jobs for debugging

## 🚀 Usage

### **Setup Repeatable Jobs**

#### **Test Mode (10s/30s intervals)**
```bash
npm run queue:scheduler setup test
```

#### **Production Mode (6h intervals)**
```bash
npm run queue:scheduler setup production
```

### **Manage Repeatable Jobs**

#### **List All Repeatable Jobs**
```bash
npm run queue:scheduler list
```

#### **Remove All Repeatable Jobs**
```bash
npm run queue:scheduler setup remove
```

#### **Show Help**
```bash
npm run queue:scheduler help
```

## ⚙️ Configuration

### **Test Configuration**
```typescript
const TEST_CONFIG = {
  mode: 'test',
  fetchInterval: 10_000,        // 10 seconds
  scoreInterval: 30_000,        // 30 seconds
  removeOnComplete: { age: 60 * 60 * 1000 },     // 1 hour
  removeOnFail: { age: 24 * 60 * 60 * 1000 }    // 24 hours
};
```

### **Production Configuration**
```typescript
const PRODUCTION_CONFIG = {
  mode: 'production',
  fetchInterval: 6 * 60 * 60 * 1000,            // 6 hours
  scoreInterval: 6 * 60 * 60 * 1000,            // 6 hours
  removeOnComplete: { age: 7 * 24 * 60 * 60 * 1000 },  // 7 days
  removeOnFail: { age: 30 * 24 * 60 * 60 * 1000 }      // 30 days
};
```

## 🔧 Technical Details

### **Job IDs**
- **`fetch-repeatable`**: Unique identifier for fetch job schedule
- **`score-repeatable`**: Unique identifier for score job schedule

### **BullMQ v5+ Features Used**
- `repeat: { every: interval }`: Sets job repetition interval
- `jobId`: Prevents duplicate schedules
- `removeOnComplete`: Automatic cleanup with age limits
- `removeOnFail`: Failed job retention policies

### **Storage Management**
```typescript
// Keep successful jobs for 1 hour in test mode
removeOnComplete: { age: 60 * 60 * 1000 }

// Keep failed jobs for 24 hours in test mode
removeOnFail: { age: 24 * 60 * 60 * 1000 }
```

## 🧪 Testing

### **Verification Script**
```bash
npm run verify:bit7
```

### **Manual Testing Steps**

1. **Setup Test Mode**
   ```bash
   npm run queue:scheduler setup test
   ```

2. **Start Worker**
   ```bash
   npm run worker
   ```

3. **Monitor Execution**
   ```bash
   npm run queue:monitor
   ```

4. **Verify Automatic Execution**
   - Wait 10-15 seconds
   - Check queue status again
   - Should see jobs being processed automatically

### **Expected Results**

- **Fetch jobs** execute every 10 seconds
- **Score jobs** execute every 30 seconds
- **Job history** is automatically cleaned up
- **No duplicate schedules** are created

## 📊 Monitoring

### **Queue Status**
```bash
npm run queue:monitor
```

### **Repeatable Jobs List**
```bash
npm run queue:scheduler list
```

### **Redis Keys Inspection**
The monitor shows Redis keys related to repeatable jobs:
- `bull:validatorQueue:repeatable`
- `bull:validatorQueue:delayed`

## 🔄 Production Deployment

### **Switching to Production Mode**
```bash
# Remove test schedules
npm run queue:scheduler remove

# Setup production schedules (6h intervals)
npm run queue:scheduler setup production
```

### **Production Considerations**

1. **Intervals**: 6 hours provides good balance between data freshness and resource usage
2. **Storage**: 7-day retention for successful jobs, 30-day for failed jobs
3. **Monitoring**: Regular checks on job execution and failure rates
4. **Scaling**: Multiple workers can process jobs in parallel

## 🚨 Troubleshooting

### **Common Issues**

#### **Jobs Not Executing**
- Check if worker is running: `npm run worker`
- Verify repeatable jobs exist: `npm run queue:scheduler list`
- Check Redis connection and queue status

#### **Duplicate Jobs**
- Use `npm run queue:scheduler remove` to clear all schedules
- Re-run setup: `npm run queue:scheduler setup test`

#### **Storage Issues**
- Check `removeOnComplete` and `removeOnFail` settings
- Monitor Redis memory usage
- Adjust retention periods if needed

### **Debug Commands**
```bash
# Check repeatable jobs
npm run queue:scheduler list

# Monitor queue in real-time
npm run queue:monitor

# Check worker status
npm run worker
```

## 🔮 Future Enhancements

### **Advanced Scheduling**
- **Cron Patterns**: More complex scheduling (e.g., "every Monday at 2 AM")
- **Time Zones**: Support for different time zones
- **Conditional Execution**: Jobs that only run under certain conditions

### **Monitoring & Alerting**
- **Job Failure Alerts**: Notifications when jobs fail
- **Performance Metrics**: Execution time tracking
- **Health Checks**: Automated system health monitoring

### **Dynamic Configuration**
- **Runtime Changes**: Modify intervals without restart
- **A/B Testing**: Different schedules for different environments
- **Load-Based Scheduling**: Adjust intervals based on system load

## 📚 Related Documentation

- [Bit 5 - Scoring System](./SCORING_README.md)
- [Bit 6 - Job Queue Integration](./QUEUE_README.md)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/documentation)

## 🎯 Acceptance Criteria

- ✅ **Repeatable jobs** are created with unique jobIds
- ✅ **Jobs execute automatically** at specified intervals
- ✅ **Storage limits** are applied (removeOnComplete/removeOnFail)
- ✅ **Easy switching** between test and production modes
- ✅ **No duplicate schedules** are created
- ✅ **Automatic cleanup** of old job data

---

**Bit 7 Complete!** 🎉 Your Solana staking backend now has automated job scheduling with easy configuration switching.
