# Solana Staking Backend

A comprehensive, production-ready backend system for Solana validator staking operations, featuring automated data collection, trust scoring, job queuing, and real-time monitoring.

## 🎯 **Project Overview**

This backend system provides a robust foundation for Solana staking applications by:

- **Automatically fetching** validator data from Solana RPC endpoints
- **Calculating trust scores** for validators based on uptime and commission
- **Maintaining historical data** for scoring runs and trust scores
- **Providing GraphQL API** for frontend applications
- **Managing background jobs** with BullMQ and Redis
- **Monitoring system health** with comprehensive metrics and logging

## 🏗️ **System Architecture**

### **Core Components**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GraphQL API   │    │   Job Queue     │    │   Database      │
│   (Express)     │◄──►│   (BullMQ)      │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Validators    │    │   Workers       │    │   Redis Cache   │
│   (Solana RPC)  │    │   (Background)  │    │   (Job Storage) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Technology Stack**

- **Runtime**: Node.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Job Queue**: BullMQ with Redis
- **API**: GraphQL with Apollo Server
- **Logging**: Pino with structured logging
- **Monitoring**: Custom metrics and health checks
- **Blockchain**: Solana RPC integration

## 📋 **Features Implemented**

### **✅ Core Functionality**
- [x] **Validator Data Fetching**: Automated collection from Solana RPC
- [x] **Trust Score Calculation**: Uptime-based scoring algorithm
- [x] **Historical Data Storage**: Complete audit trail of all operations
- [x] **GraphQL API**: RESTful data access with GraphQL
- [x] **Background Job Processing**: Asynchronous task execution
- [x] **Scheduled Operations**: Automated fetch and scoring cycles
- [x] **Error Handling**: Graceful failure management and retries
- [x] **Connection Management**: Robust database and Redis handling

### **✅ Advanced Features**
- [x] **Job Queuing**: BullMQ with Redis for reliable job processing
- [x] **Worker Management**: Concurrent job processing with configurable limits
- [x] **Repeatable Jobs**: Automated scheduling for data updates
- [x] **Structured Logging**: Comprehensive logging with context
- [x] **Health Monitoring**: System health checks and metrics
- [x] **Audit Logging**: Complete operation tracking
- [x] **Performance Metrics**: Job duration, success rates, coverage
- **Idempotent Operations**: Safe repeated execution

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- PostgreSQL 13+
- Redis 6+
- Solana RPC endpoint access

### **Installation**

```bash
# Clone the repository
git clone <repository-url>
cd sol-stake-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
npx prisma db push
npx prisma generate

# Start the system
npm run dev          # GraphQL server
npm run worker       # Background worker
```

### **Environment Variables**

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sol_stake"

# Redis
REDIS_URL="redis://localhost:6379"

# Solana
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"

# Server
PORT=4000
NODE_ENV=development
```

## 📊 **Database Schema**

### **Core Tables**

#### **Validator**
```prisma
model Validator {
  id              String    @id @default(cuid())
  voteAccount     String    @unique
  name            String?
  validatorPubkey String    @unique
  commission      Float?
  uptime          Float
  trustScores     TrustScore[]
  stakeAccounts   StakeAccount[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([validatorPubkey])
}
```

#### **TrustScore**
```prisma
model TrustScore {
  id           String     @id @default(cuid())
  validatorId  String
  score        Float
  scoringRunId String
  createdAt    DateTime   @default(now())

  validator    Validator  @relation(fields: [validatorId], references: [id])
  scoringRun   ScoringRun @relation(fields: [scoringRunId], references: [id])
}
```

#### **ScoringRun**
```prisma
model ScoringRun {
  id             String       @id @default(cuid())
  runDate        DateTime     @default(now())
  status         String       @default("completed")
  validatorCount Int          @default(0)
  successCount   Int          @default(0)
  failCount      Int          @default(0)
  createdAt      DateTime     @default(now())
  trustScores    TrustScore[]
}
```

#### **AuditLog**
```prisma
model AuditLog {
  id        String   @id @default(cuid())
  action    String
  actorId   String?
  metadata  Json
  createdAt DateTime @default(now())
}
```

## 🔧 **API Reference**

### **GraphQL Endpoint**
- **URL**: `http://localhost:4000`
- **Playground**: Available at the same URL

### **Core Queries**

#### **Get All Validators**
```graphql
query GetValidators {
  validators {
    id
    validatorPubkey
    voteAccount
    commission
    uptime
    latestTrustScore {
      score
      createdAt
      scoringRunId
    }
  }
}
```

#### **Get Scoring Runs**
```graphql
query GetScoringRuns {
  scoringRuns {
    id
    runDate
    status
    validatorCount
    successCount
    failCount
    trustScores {
      score
      validator {
        validatorPubkey
      }
    }
  }
}
```

#### **Get Users with Stake Accounts**
```graphql
query GetUsers {
  users {
    id
    walletPubkey
    stakeAccounts {
      id
      stakedAmount
      validator {
        validatorPubkey
        name
      }
    }
  }
}
```

## ⚡ **Job Queue System**

### **Queue Types**

#### **Fetch Jobs**
- **Purpose**: Retrieve validator data from Solana RPC
- **Frequency**: Configurable (30s test, 6h production)
- **Data**: Updates validator records with latest information

#### **Score Jobs**
- **Purpose**: Calculate trust scores for all validators
- **Frequency**: Configurable (60s test, 6h production)
- **Data**: Creates TrustScore records with ScoringRun references

### **Job Configuration**

```typescript
// Test Mode (30s intervals)
const TEST_CONFIG = {
  fetchInterval: 30_000,        // 30 seconds
  scoreInterval: 60_000,        // 60 seconds
  removeOnComplete: { age: 60 * 60 * 1000 }, // 1 hour
  removeOnFail: { age: 24 * 60 * 60 * 1000 } // 24 hours
};

// Production Mode (6h intervals)
const PRODUCTION_CONFIG = {
  fetchInterval: 6 * 60 * 60 * 1000,        // 6 hours
  scoreInterval: 6 * 60 * 60 * 1000,        // 6 hours
  removeOnComplete: { age: 7 * 24 * 60 * 60 * 1000 }, // 7 days
  removeOnFail: { age: 30 * 24 * 60 * 60 * 1000 }     // 30 days
};
```

### **Worker Configuration**

```typescript
export const validatorWorker = new Worker(
  'validatorQueue',
  async (job) => { /* job processing logic */ },
  { 
    connection: redis,
    concurrency: 3,           // Process up to 3 jobs simultaneously
    maxStalledCount: 2,       // Retry stalled jobs up to 2 times
    stalledInterval: 30000    // Check for stalled jobs every 30 seconds
  }
);
```

## 📈 **Monitoring & Observability**

### **Metrics Collection**

#### **System Metrics**
- Database connection status
- Redis memory usage
- Queue depth and processing rates
- Worker health and performance

#### **Job Metrics**
- Job success/failure rates
- Processing duration
- Coverage statistics
- Error patterns

#### **Business Metrics**
- Validator count and data freshness
- Scoring run completion rates
- Trust score distribution
- System uptime and reliability

### **Health Checks**

```bash
# System health overview
npm run metrics:summary

# Detailed health check
npm run metrics:health

# Prometheus metrics export
npm run metrics:prometheus
```

### **Logging**

The system uses structured logging with Pino, providing:

- **Job Context**: Job ID, type, and execution details
- **Batch Context**: Processing batch information
- **Validator Context**: Individual validator processing details
- **Completion Context**: Job results and performance metrics

Example log output:
```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "jobType": "score",
  "phase": "validator-processing",
  "batchNumber": 14,
  "totalBatches": 23,
  "progress": "650/1102",
  "successRate": "94.5%",
  "msg": "✅ Processed 650/1102 validators"
}
```

## 🧪 **Testing & Verification**

### **Automated Testing**

#### **Bit 9 - Full Pipeline Test**
```bash
npm run verify:bit9
```
Comprehensive end-to-end testing of the entire system.

#### **Database Verification**
```bash
npm run verify:db
```
Validates database integrity and data relationships.

#### **Individual Component Tests**
```bash
# Test scoring system
npm run score:all

# Test job queue
npm run queue:monitor

# Test metrics
npm run metrics:summary
```

### **Manual Testing**

#### **GraphQL API Testing**
1. Start the server: `npm run dev`
2. Open GraphQL Playground: `http://localhost:4000`
3. Execute test queries
4. Verify data integrity

#### **Job Queue Testing**
1. Start worker: `npm run worker`
2. Add test jobs: `npm run queue:add fetch`
3. Monitor execution: `npm run queue:monitor`
4. Verify database changes

## 🚀 **Production Deployment**

### **Environment Setup**

#### **Production Environment Variables**
```bash
NODE_ENV=production
DATABASE_URL="postgresql://user:password@prod-host:5432/sol_stake"
REDIS_URL="redis://prod-redis:6379"
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
PORT=4000
```

#### **Production Job Scheduling**
```bash
# Switch to production intervals (6h)
npm run queue:scheduler production

# Verify configuration
npm run queue:scheduler list
```

### **Deployment Options**

#### **Option 1: PM2 Process Manager**
```bash
# Install PM2
npm install -g pm2

# Start services
pm2 start ecosystem.config.js

# Monitor processes
pm2 monit

# View logs
pm2 logs
```

#### **Option 2: Docker Deployment**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["npm", "start"]
```

#### **Option 3: Kubernetes**
- Deploy PostgreSQL and Redis
- Configure persistent volumes
- Set up horizontal pod autoscaling
- Configure ingress for GraphQL API

### **Monitoring & Alerting**

#### **Health Check Endpoints**
- **System Health**: `GET /health`
- **Metrics**: `GET /metrics`
- **Prometheus**: `GET /metrics/prometheus`

#### **Recommended Monitoring**
- **Infrastructure**: CPU, memory, disk usage
- **Application**: Response times, error rates
- **Database**: Connection pool, query performance
- **Redis**: Memory usage, connection count
- **Queue**: Job processing rates, failure rates

## 🔒 **Security Considerations**

### **Access Control**
- Database connection security
- Redis access restrictions
- API rate limiting
- Environment variable protection

### **Data Protection**
- Input validation and sanitization
- SQL injection prevention (Prisma handles this)
- Sensitive data encryption
- Audit logging for compliance

### **Network Security**
- HTTPS enforcement in production
- CORS configuration
- API authentication (implement as needed)
- Network isolation for sensitive services

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Database Connection Errors**
```bash
# Check database status
npm run metrics:health

# Verify connection string
echo $DATABASE_URL

# Test connection
npx prisma db push
```

#### **2. Redis Connection Issues**
```bash
# Check Redis status
redis-cli ping

# Verify Redis URL
echo $REDIS_URL

# Test queue operations
npm run queue:monitor
```

#### **3. Job Processing Failures**
```bash
# Check worker logs
npm run worker

# Monitor queue status
npm run queue:monitor

# Verify job configuration
npm run queue:scheduler list
```

#### **4. GraphQL API Issues**
```bash
# Check server status
npm run dev

# Test API endpoint
curl http://localhost:4000

# Verify schema
npx prisma generate
```

### **Debug Commands**

```bash
# View system metrics
npm run metrics:summary

# Check queue health
npm run queue:monitor

# Verify database
npm run verify:db

# Test full pipeline
npm run verify:bit9
```

## 📚 **Development Workflow**

### **Adding New Features**

1. **Update Prisma Schema**: Add new models/fields
2. **Generate Client**: `npx prisma generate`
3. **Update GraphQL Schema**: Add new types/queries
4. **Implement Resolvers**: Add business logic
5. **Add Tests**: Create verification scripts
6. **Update Documentation**: Document new features

### **Code Organization**

```
src/
├── api/                    # GraphQL API layer
│   ├── schema/            # GraphQL schema definitions
│   └── resolvers/         # Query and mutation handlers
├── lib/                   # Shared libraries
│   ├── prisma.ts         # Database client
│   └── redis.ts          # Redis connection
├── workers/               # Background job processors
│   ├── fetchValidators.ts # Validator data fetching
│   └── scoringAllValidators.ts # Trust score calculation
├── queues/                # Job queue management
│   ├── validatorQueue.ts  # Main queue and worker
│   ├── scheduler.ts       # Repeatable job scheduling
│   └── monitor.ts         # Queue monitoring
└── metrics/               # System monitoring
    ├── metrics.ts         # Metrics collection
    └── cli.ts            # Metrics CLI interface
```

## 🔄 **Maintenance & Updates**

### **Regular Maintenance Tasks**

#### **Daily**
- Monitor system health metrics
- Check job success rates
- Review error logs

#### **Weekly**
- Analyze performance trends
- Review audit logs
- Update validator data

#### **Monthly**
- Database maintenance and optimization
- Review and update scoring algorithms
- Performance tuning and optimization

### **Update Procedures**

#### **Schema Updates**
```bash
# 1. Update Prisma schema
# 2. Apply changes
npx prisma db push

# 3. Regenerate client
npx prisma generate

# 4. Restart services
pm2 restart all
```

#### **Code Updates**
```bash
# 1. Pull latest changes
git pull origin main

# 2. Install dependencies
npm install

# 3. Apply database changes
npx prisma db push

# 4. Restart services
pm2 restart all
```

## 🎯 **Future Enhancements**

### **Planned Features**
- **Real-time WebSocket updates** for live data streaming
- **Advanced scoring algorithms** with machine learning
- **Multi-chain support** for other blockchain networks
- **User authentication and authorization**
- **Advanced analytics and reporting**
- **Mobile API optimization**

### **Scalability Improvements**
- **Horizontal scaling** with multiple worker instances
- **Database sharding** for large datasets
- **Caching layers** for improved performance
- **Load balancing** for high availability
- **Microservices architecture** for modularity

## 📞 **Support & Contributing**

### **Getting Help**
- **Documentation**: This README and related docs
- **Issues**: GitHub issue tracker
- **Discussions**: GitHub discussions for questions

### **Contributing**
1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request
5. Ensure all tests pass

### **Code Standards**
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Testing**: Comprehensive test coverage

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 **Acknowledgments**

- **Solana Foundation** for blockchain infrastructure
- **Prisma Team** for excellent ORM tools
- **BullMQ Team** for robust job queue system
- **Apollo GraphQL** for GraphQL server implementation

---

**🎉 Congratulations! You now have a production-ready Solana staking backend system.**

This system provides a solid foundation for building staking applications with automated data collection, intelligent scoring, and comprehensive monitoring. The architecture is designed to scale with your needs while maintaining reliability and performance.

For questions or support, please refer to the troubleshooting section or create an issue in the repository.
