# Bit 9 — Final Full-Pipeline Test & Acceptance

## 🎯 **Goal**
Run the full pipeline (fetch all → score all) via scheduled jobs and verify all deliverables are met. This is the final acceptance test to ensure the system is production-ready.

## 📋 **Acceptance Criteria**
- [ ] Validators persisted in DB with correct fields
- [ ] TrustScore + ScoringRun history saved for at least one run
- [ ] BullMQ jobs visible in Redis and worker processed at least one job
- [ ] Logs show normal completion (no uncaught errors)
- [ ] System is idempotent for repeated runs
- [ ] Handles transient RPC errors gracefully

## 🚀 **Quick Start**

### **1. Run Full Pipeline Test**
```bash
npm run verify:bit9
```

### **2. Verify Database (Optional)**
```bash
npm run verify:db
```

## 📅 **Test Configuration**

### **Test Mode (30s intervals)**
- **Fetch Jobs**: Every 30 seconds
- **Score Jobs**: Every 60 seconds (allows fetch to complete first)
- **Purpose**: Rapid testing and validation

### **Production Mode (6h intervals)**
- **Fetch Jobs**: Every 6 hours
- **Score Jobs**: Every 6 hours
- **Purpose**: Production deployment

## 🔧 **Detailed Test Procedure**

### **Phase 1: Setup Test Scheduling**
```bash
npm run queue:scheduler setup
```
- Configures repeatable jobs with 30s fetch, 60s score intervals
- Clears existing repeatable jobs to avoid conflicts
- Sets appropriate cleanup policies

### **Phase 2: Start Worker**
```bash
npm run worker
```
- Worker starts and verifies database connection
- Begins listening for jobs on validatorQueue
- Shows "Database connection verified, worker ready to process jobs"

### **Phase 3: Monitor Execution**
- **Fetch Job**: Runs every 30 seconds, fetches validator data from Solana
- **Score Job**: Runs every 60 seconds, calculates trust scores for all validators
- **Pipeline Flow**: Fetch → Process → Score → Store → Repeat

### **Phase 4: Verification**
```bash
npm run metrics:summary    # System health overview
npm run queue:monitor      # Queue status and recent jobs
npm run metrics:health     # Detailed health check
npm run verify:db          # Database verification
```

## 📊 **Expected Results**

### **Database Tables**
1. **Validators**: 1,000+ validators with complete data
2. **ScoringRun**: Multiple scoring execution records
3. **TrustScore**: Trust scores for each validator per run

### **Queue Status**
- **Active Jobs**: 0-2 (depending on timing)
- **Completed Jobs**: Increasing count
- **Failed Jobs**: 0 (or minimal with retries)
- **Repeatable Jobs**: 2 (fetch and score)

### **Worker Logs**
```
🚀 Worker ready, verifying database connection...
✅ Database connection verified, worker ready to process jobs
🚀 Processing job: fetch
📥 Starting fetch validators job...
✅ Fetch validators job completed successfully
🚀 Processing job: score
🎯 Starting score validators job...
✅ Score validators job completed successfully
```

## 🔍 **Verification Checklist**

### **System Health**
- [ ] Worker starts without errors
- [ ] Database connection established
- [ ] Redis connection working
- [ ] Queue jobs processing successfully

### **Data Integrity**
- [ ] Validators have all required fields (pubkey, voteAccount, commission, uptime)
- [ ] TrustScores reference valid ScoringRun IDs
- [ ] No orphaned records
- [ ] Data relationships maintained

### **Performance**
- [ ] Jobs complete within reasonable time
- [ ] No memory leaks or connection issues
- [ ] Graceful error handling
- [ ] Automatic retry mechanism working

### **Idempotency**
- [ ] Repeated runs don't create duplicate data
- [ ] Historical data preserved
- [ ] New runs create new records with proper references

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. "Engine is not yet connected"**
- **Cause**: Prisma connection not ready
- **Solution**: Worker now includes connection management
- **Check**: Worker logs should show "Database connection verified"

#### **2. Jobs not processing**
- **Cause**: Worker not running or Redis issues
- **Solution**: Restart worker, check Redis connection
- **Check**: `npm run queue:monitor`

#### **3. Low scoring coverage**
- **Cause**: RPC errors or validation failures
- **Solution**: Check Solana RPC endpoint, review error logs
- **Check**: Worker logs for specific error messages

#### **4. Memory issues**
- **Cause**: Large validator sets or connection leaks
- **Solution**: Monitor memory usage, restart worker periodically
- **Check**: System metrics and worker logs

### **Debug Commands**
```bash
# Check queue status
npm run queue:monitor

# View system metrics
npm run metrics:summary

# Verify database
npm run verify:db

# Check Redis keys
redis-cli KEYS "*validatorQueue*"
```

## 🎉 **Success Criteria**

### **Minimum Requirements**
- ✅ 1,000+ validators in database
- ✅ At least 1 successful scoring run
- ✅ 90%+ scoring coverage
- ✅ No critical errors in logs
- ✅ Jobs processing automatically

### **Production Ready**
- ✅ All acceptance criteria met
- ✅ System handles errors gracefully
- ✅ Performance within acceptable limits
- ✅ Monitoring and observability working
- ✅ Documentation complete

## 🔄 **Next Steps After Success**

### **1. Switch to Production Mode**
```bash
npm run queue:scheduler production
```

### **2. Deploy to Production**
- Update environment variables
- Configure monitoring and alerting
- Set up backup and recovery procedures

### **3. Ongoing Maintenance**
- Monitor job success rates
- Review performance metrics
- Update validator data regularly
- Maintain system health

## 📚 **Related Documentation**

- [Bit 5 - Scoring System](../SCORING_README.md)
- [Bit 6 - Job Queue](../QUEUE_README.md)
- [Bit 7 - Scheduling](../SCHEDULER_README.md)
- [Bit 8 - Observability](../OBSERVABILITY_README.md)

## 🎯 **Week 3 Completion**

When Bit 9 is successfully completed, you will have:
- ✅ **Complete Solana Staking Backend**
- ✅ **Automated Data Pipeline**
- ✅ **Production-Ready System**
- ✅ **Comprehensive Monitoring**
- ✅ **Full Documentation**

**Congratulations! Your Solana staking backend is ready for production deployment! 🚀**
