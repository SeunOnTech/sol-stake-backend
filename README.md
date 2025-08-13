# Solana Staking Backend

A comprehensive, production-ready backend system for Solana validator staking operations, featuring automated data collection, trust scoring, job queuing, real-time monitoring, Redis caching, JWT authentication, and rate limiting.

## 🎯 **Project Overview**

This backend system provides a robust foundation for Solana staking applications by:

- **Automatically fetching** validator data from Solana RPC endpoints
- **Calculating trust scores** for validators based on uptime and commission
- **Maintaining historical data** for scoring runs and trust scores
- **Providing GraphQL API** for frontend applications
- **Managing background jobs** with BullMQ and Redis
- **Monitoring system health** with comprehensive metrics and logging
- **Implementing Redis caching** for improved query performance
- **Securing endpoints** with JWT authentication and role-based access control
- **Protecting against abuse** with intelligent rate limiting

## 🏗️ **System Architecture**

### **Core Components**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GraphQL API   │    │   Job Queue     │    │   Database      │
│   (Express)     │◄──►│   (BullMQ)      │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Redis Cache   │    │   Rate Limiter  │    │   Auth Service  │
│   (5min TTL)    │    │   (100/15min)   │    │   (JWT)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Technology Stack**

- **Runtime**: Node.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Job Queue**: BullMQ with Redis
- **API**: GraphQL with Apollo Server
- **Caching**: Redis with configurable TTL
- **Authentication**: JWT with role-based permissions
- **Rate Limiting**: Redis-based with IP + user tracking
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

### **✅ Week 4 - Security & Performance**
- [x] **Redis Query Caching**: 5-minute TTL for hot queries
- [x] **JWT Authentication**: Secure token-based authentication
- [x] **Role-Based Access Control**: Viewer, User, and Admin roles
- [x] **Rate Limiting**: 100 requests per 15 minutes per IP
- [x] **Protected Endpoints**: Secure GraphQL queries and mutations
- [x] **Cache Management**: Admin-only cache invalidation
- [x] **Permission System**: Granular access control for operations

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

# Start the server
npm run dev
```

### **Environment Variables**

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sol_stake"

# Redis
REDIS_URL="redis://localhost:6379"

# Solana
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"

# JWT (change in production!)
JWT_SECRET_KEY="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRY="24h"

# Server
PORT=3007
NODE_ENV=development
```

## 🛣️ **Available Routes & Endpoints**

### **REST Endpoints**

#### **Health & Status**
```http
GET  /health                    # System health check
GET  /cache/status             # Redis cache statistics
POST /cache/clear              # Clear all cache (Admin only)
```

#### **Response Examples**

**Health Check:**
```json
{
  "status": "ok"
}
```

**Cache Status:**
```json
{
  "status": "ok",
  "cache": {
    "totalKeys": 15,
    "memoryUsage": "2.5M",
    "hitRate": null
  }
}
```

### **GraphQL Endpoints**

#### **Public Queries (No Authentication Required)**
```graphql
# Get all validators with latest trust scores
query {
  validators {
    id
    validatorPubkey
    uptime
    commission
    latestTrustScore {
      score
      createdAt
    }
  }
}
```

#### **Protected Queries (Authentication Required)**

**Users Query (requires `read:users` permission):**
```graphql
query {
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

**Scoring Runs Query (requires `read:scores` permission):**
```graphql
query {
  scoringRuns {
    id
    runDate
    trustScores {
      score
      validator {
        validatorPubkey
      }
    }
  }
}
```

**System Stats Query (requires `admin` role):**
```graphql
query {
  systemStats {
    validatorCount
    userCount
    scoringRunCount
    timestamp
  }
}
```

**Cache Status Query (requires `admin:system` permission):**
```graphql
query {
  cacheStatus {
    totalKeys
    memoryUsage
    hitRate
  }
}
```

#### **Protected Mutations (Authentication Required)**

**Clear Cache (requires `admin:system` permission):**
```graphql
mutation {
  clearCache {
    success
    message
    timestamp
  }
}
```

**Invalidate Validator Cache (requires `admin:system` permission):**
```graphql
mutation {
  invalidateValidatorCache {
    success
    message
    timestamp
  }
}
```

## 🔐 **Authentication & Authorization**

### **JWT Token Structure**
```json
{
  "userId": "user-123",
  "email": "user@example.com",
  "role": "admin",
  "permissions": ["read:validators", "read:scores", "admin:system"],
  "iat": 1640995200,
  "exp": 1641081600
}
```

### **User Roles & Permissions**

#### **👁️ Viewer Role**
- **Permissions**: `read:validators`, `read:scores`
- **Access**: Public data only
- **Use Case**: Read-only access for public information

#### **👤 User Role**
- **Permissions**: `read:validators`, `read:scores`, `write:stakes`
- **Access**: Public data + stake management
- **Use Case**: Regular users managing their stakes

#### **👑 Admin Role**
- **Permissions**: `read:validators`, `read:scores`, `write:stakes`, `write:validators`, `admin:system`
- **Access**: Full system access
- **Use Case**: System administration and maintenance

### **Authentication Headers**
```http
Authorization: Bearer <your-jwt-token>
```

### **Testing Authentication**
```bash
# Generate test tokens
npm run generate:tokens

# Use tokens in requests
curl -H "Authorization: Bearer <token>" http://localhost:3007/graphql
```
```bash
# Generate test tokens
npm run generate:tokens

# Use tokens in requests
curl -H "Authorization: Bearer <token>" http://localhost:3007/graphql
```

## 💾 **Redis Caching System**

### **Cache Configuration**
- **TTL**: 5 minutes (300 seconds) for hot queries
- **Key Pattern**: `graphql:<hash>` for GraphQL queries
- **Storage**: Redis with automatic expiration
- **Scope**: Query + variables hash for precise caching

### **Cache Behavior**
- **Cache Miss**: First request stores result in Redis
- **Cache Hit**: Subsequent identical requests return cached data
- **Automatic Expiry**: Keys expire after 5 minutes
- **Query-Specific**: Different query parameters create separate cache entries

### **Cache Management**
```bash
# View cache statistics
curl http://localhost:3007/cache/status

# Clear all cache (Admin only)
curl -X POST http://localhost:3007/cache/clear \
  -H "Authorization: Bearer <admin-token>"
```

## ⚡ **Rate Limiting**

### **Configuration**
- **Window**: 15 minutes (900,000 ms)
- **Limit**: 100 requests per window per IP
- **Tracking**: IP address + user ID combination
- **Storage**: Redis sorted sets with automatic cleanup

### **Rate Limit Headers**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200000
```

### **Rate Limit Response (429)**
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 300
}
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

### **Core Queries**

#### **Get All Validators**
```graphql
query GetValidators {
  validators {
    id
    voteAccount
    name
    validatorPubkey
    commission
    uptime
    trustScores {
      id
      score
      createdAt
      scoringRunId
    }
    latestTrustScore {
      id
      score
      createdAt
    }
    createdAt
    updatedAt
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

#### **Get System Statistics (Admin Only)**
```graphql
query GetSystemStats {
  systemStats {
    validatorCount
    userCount
    scoringRunCount
    timestamp
  }
}
```

### **Cache Management Mutations (Admin Only)**

#### **Clear All Cache**
```graphql
mutation ClearCache {
  clearCache {
    success
    message
    timestamp
  }
}
```

#### **Invalidate Validator Cache**
```graphql
mutation InvalidateValidatorCache {
  invalidateValidatorCache {
    success
    message
    timestamp
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
const TEST_CONFIG = {
  fetchInterval: 30_000,        // 30 seconds
  scoreInterval: 60_000,        // 60 seconds
  removeOnComplete: { age: 60 * 60 * 1000 }, // 1 hour
  removeOnFail: { age: 24 * 60 * 60 * 1000 } // 24 hours
};

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
- Redis memory usage and cache hit rates
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
npm run metrics:health

# Cache status
curl http://localhost:3007/cache/status

# Rate limit info
# Check response headers for X-RateLimit-* values
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
  "time": "2024-01-01T12:00:00.000Z",
  "jobType": "score",
  "phase": "validator-processing",
  "batchNumber": 14,
  "totalBatches": 23,
  "progress": "650/1102",
  "successRate": "94.5%",
  "validatorId": "validator-123"
}
```

## 🧪 **Testing & Verification**

### **Automated Testing**

#### **Week 4 - Full Feature Test**
```bash
npm run test:week4
```
Comprehensive end-to-end testing of caching, authentication, and rate limiting.

#### **Authentication Testing**
```bash
# Generate test JWT tokens for different roles
npm run generate:tokens

# Test with viewer role
curl -H "Authorization: Bearer <viewer-token>" http://localhost:3007/graphql

# Test with admin role
curl -H "Authorization: Bearer <admin-token>" http://localhost:3007/graphql
```

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

# Generate test JWT tokens
npm run generate:tokens
```

### **Manual Testing**

#### **GraphQL API Testing**
1. Start the server: `npm run dev`
2. Open GraphQL Playground: `http://localhost:3007/graphql`
3. Execute test queries
4. Verify data integrity and caching

#### **Authentication Testing**
1. Generate test tokens: `npm run generate:tokens`
2. Test public endpoints (no token required)
3. Test protected endpoints (token required)
4. Verify role-based permissions

#### **Cache Testing**
1. Make first query (cache miss)
2. Make identical query (cache hit)
3. Check cache status: `curl http://localhost:3007/cache/status`
4. Clear cache (admin only)

#### **Rate Limiting Testing**
1. Make multiple rapid requests
2. Check rate limit headers
3. Exceed limit to see 429 response
4. Wait for window reset

#### **Authentication Testing**
1. Generate test tokens: `npm run generate:tokens`
2. Test public endpoints (no token required)
3. Test protected endpoints (token required)
4. Verify role-based permissions

#### **Cache Testing**
1. Make first query (cache miss)
2. Make identical query (cache hit)
3. Check cache status: `curl http://localhost:3007/cache/status`
4. Clear cache (admin only)

#### **Rate Limiting Testing**
1. Make multiple rapid requests
2. Check rate limit headers
3. Exceed limit to see 429 response
4. Wait for window reset

## 🚀 **Production Deployment**

### **Environment Setup**

#### **Production Environment Variables**
```bash
NODE_ENV=production
DATABASE_URL="postgresql://user:password@prod-host:5432/sol_stake"
REDIS_URL="redis://prod-redis:6379"
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
JWT_SECRET_KEY="your-production-secret-key"
JWT_EXPIRY="24h"
PORT=4000
```

#### **Production Job Scheduling**
```bash
# Switch to production intervals (6h)
npm run queue:scheduler setup production
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
- **Cache Status**: `GET /cache/status`
- **GraphQL**: `POST /graphql`

#### **Recommended Monitoring**
- **Infrastructure**: CPU, memory, disk usage
- **Application**: Response times, error rates, cache hit rates
- **Database**: Connection pool, query performance
- **Redis**: Memory usage, connection count, cache efficiency
- **Queue**: Job processing rates, failure rates
- **Authentication**: Token validation success rates
- **Rate Limiting**: Request patterns, blocked requests

## 🔒 **Security Considerations**

### **Access Control**
- JWT token validation on all protected endpoints
- Role-based permission system
- IP-based rate limiting
- Admin-only cache management

### **Data Protection**
- Input validation and sanitization
- SQL injection prevention (Prisma handles this)
- Sensitive data encryption
- Audit logging for compliance

### **Network Security**
- HTTPS enforcement in production
- CORS configuration
- API authentication required for sensitive operations
- Network isolation for sensitive services

### **JWT Security**
- Secure secret key management
- Token expiration (24h default)
- Issuer and audience validation
- Role and permission verification

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Authentication Errors**
```bash
# Check JWT token validity
npm run generate:tokens

# Verify token in request headers
curl -H "Authorization: Bearer <token>" http://localhost:3007/graphql
```

#### **2. Cache Issues**
```bash
# Check cache status
curl http://localhost:3007/cache/status

# Clear cache if needed (admin only)
curl -X POST http://localhost:3007/cache/clear \
  -H "Authorization: Bearer <admin-token>"
```

#### **3. Rate Limiting Issues**
```bash
# Check rate limit headers in responses
# Look for X-RateLimit-* headers

# Wait for rate limit window to reset
# Default: 15 minutes
```

#### **4. Database Connection Errors**
```bash
# Check database status
npm run metrics:health

# Verify connection string
echo $DATABASE_URL

# Test connection
npx prisma db push
```

#### **5. Redis Connection Issues**
```bash
# Check Redis status
redis-cli ping

# Verify Redis URL
echo $REDIS_URL

# Test queue operations
npm run queue:monitor
```

#### **6. Job Processing Failures**
```bash
# Check worker logs
npm run worker

# Monitor queue status
npm run queue:monitor

# Verify job configuration
npm run queue:scheduler list
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
npm run test:week4

# Generate test tokens
npm run generate:tokens
```

## 🔄 **Development Workflow**

### **Adding New Features**

1. **Update Prisma Schema**: Add new models/fields
2. **Generate Client**: `npx prisma generate`
3. **Update GraphQL Schema**: Add new types/queries
4. **Implement Resolvers**: Add business logic with proper auth
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
│   ├── redis.ts          # Redis connection
│   ├── cache.ts          # Redis caching utilities
│   ├── auth.ts           # JWT authentication
│   └── rateLimit.ts      # Rate limiting utilities
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
- Monitor cache hit rates

#### **Weekly**
- Analyze performance trends
- Review audit logs
- Update validator data
- Check rate limiting patterns

#### **Monthly**
- Database maintenance and optimization
- Review and update scoring algorithms
- Performance tuning and optimization
- Security audit and token rotation

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

#### **Cache Management**
```bash
# Clear all cache (admin only)
curl -X POST http://localhost:3007/cache/clear \
  -H "Authorization: Bearer <admin-token>"

# Monitor cache performance
curl http://localhost:3007/cache/status
```

## 🎯 **Future Enhancements**

### **Planned Features**
- **Real-time WebSocket updates** for live data streaming
- **Advanced scoring algorithms** with machine learning
- **Multi-chain support** for other blockchain networks
- **User authentication and authorization** (real user management)
- **Advanced analytics and reporting**
- **Mobile API optimization**
- **Enhanced caching strategies** with cache warming

### **Scalability Improvements**
- **Horizontal scaling** with multiple worker instances
- **Database sharding** for large datasets
- **Caching layers** for improved performance
- **Load balancing** for high availability
- **Microservices architecture** for modularity
- **Redis clustering** for high-performance caching

## 📞 **Support & Contributing**

### **Getting Help**
- Check the troubleshooting section above
- Review logs for error details
- Verify environment configuration
- Test individual components

### **Contributing**
1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request
5. Ensure all tests pass

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 **Acknowledgments**

- Solana Foundation for blockchain infrastructure
- Prisma team for excellent ORM tooling
- BullMQ team for reliable job queuing
- Redis team for high-performance caching

---

**🎉 Congratulations! You now have a production-ready Solana staking backend system with enterprise-grade security and performance features.**

This system provides a solid foundation for building staking applications with automated data collection, intelligent scoring, comprehensive monitoring, Redis caching, JWT authentication, and rate limiting. The architecture is designed to scale with your needs while maintaining reliability, security, and performance.

For questions or support, please refer to the troubleshooting section or create an issue in the repository.

## 🚀 **Quick Commands Reference**

```bash
# Development
npm run dev                    # Start GraphQL server
npm run worker                # Start background worker
npm run build                 # Build TypeScript

# Job Queue Management
npm run queue:add fetch       # Add fetch job
npm run queue:add score       # Add score job
npm run queue:monitor         # Monitor queue status
npm run queue:scheduler       # Manage repeatable jobs

# Testing & Verification
npm run test:week4            # Full Week 4 feature test
npm run verify:db             # Database verification
npm run score:all             # Test scoring system
npm run generate:tokens       # Generate test JWT tokens

# Monitoring
npm run metrics:summary       # System overview
npm run metrics:health        # Health check
npm run metrics:prometheus    # Prometheus export

# Cache Management
curl http://localhost:3007/cache/status                    # View cache stats
curl -X POST http://localhost:3007/cache/clear \          # Clear cache (admin)
  -H "Authorization: Bearer <admin-token>"
```
