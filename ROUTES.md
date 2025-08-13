# 🛣️ **Solana Staking Backend - Complete Routes Reference**

This document provides a comprehensive overview of all available routes and endpoints in the Solana Staking Backend system.

## 📍 **Base URL**
```
http://localhost:3007 (development)
http://your-domain.com (production)
```

## 🔗 **REST Endpoints**

### **Health & Status**
| Method | Endpoint | Description | Auth Required | Rate Limited |
|--------|----------|-------------|---------------|--------------|
| `GET` | `/health` | System health check | ❌ No | ❌ No |
| `GET` | `/cache/status` | Redis cache statistics | ❌ No | ❌ No |
| `POST` | `/cache/clear` | Clear all cache | ✅ Yes (Admin) | ❌ No |

### **Response Examples**

#### **Health Check (`GET /health`)**
```json
{
  "status": "ok"
}
```

#### **Cache Status (`GET /cache/status`)**
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

#### **Clear Cache (`POST /cache/clear`)**
```json
{
  "status": "ok",
  "message": "Cache cleared successfully"
}
```

## 🎯 **GraphQL Endpoint**

### **Main GraphQL Endpoint**
| Method | Endpoint | Description | Auth Required | Rate Limited |
|--------|----------|-------------|---------------|--------------|
| `POST` | `/graphql` | GraphQL API endpoint | Depends on query | ✅ Yes |

## 📊 **GraphQL Queries**

### **Public Queries (No Authentication Required)**

#### **Validators Query**
```graphql
query {
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
      validatorId
    }
    latestTrustScore {
      id
      score
      createdAt
      scoringRunId
      validatorId
    }
    createdAt
    updatedAt
  }
}
```

**Response Fields:**
- `id`: Unique validator identifier
- `voteAccount`: Solana vote account address
- `name`: Validator name (optional)
- `validatorPubkey`: Validator public key
- `commission`: Commission rate (optional)
- `uptime`: Uptime percentage
- `trustScores`: Array of historical trust scores
- `latestTrustScore`: Most recent trust score
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### **Protected Queries (Authentication Required)**

#### **Users Query (requires `read:users` permission)**
```graphql
query {
  users {
    id
    walletPubkey
    stakeAccounts {
      id
      walletPubkey
      stakedAmount
      validator {
        validatorPubkey
        name
      }
    }
  }
}
```

**Response Fields:**
- `id`: Unique user identifier
- `walletPubkey`: User's wallet public key
- `stakeAccounts`: Array of user's stake accounts
  - `id`: Stake account identifier
  - `walletPubkey`: Associated wallet
  - `stakedAmount`: Amount staked
  - `validator`: Validator information

#### **Scoring Runs Query (requires `read:scores` permission)**
```graphql
query {
  scoringRuns {
    id
    runDate
    status
    validatorCount
    successCount
    failCount
    trustScores {
      id
      score
      createdAt
      scoringRunId
      validatorId
      validator {
        validatorPubkey
        name
      }
    }
  }
}
```

**Response Fields:**
- `id`: Unique scoring run identifier
- `runDate`: When the scoring run was executed
- `status`: Run status (running, completed, failed)
- `validatorCount`: Total validators processed
- `successCount`: Successfully scored validators
- `failCount`: Failed scoring attempts
- `trustScores`: Array of trust scores from this run

#### **System Stats Query (requires `admin` role)**
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

**Response Fields:**
- `validatorCount`: Total validators in system
- `userCount`: Total users in system
- `scoringRunCount`: Total scoring runs executed
- `timestamp`: When stats were collected

#### **Cache Status Query (requires `admin:system` permission)**
```graphql
query {
  cacheStatus {
    totalKeys
    memoryUsage
    hitRate
  }
}
```

**Response Fields:**
- `totalKeys`: Number of cached items
- `memoryUsage`: Redis memory usage
- `hitRate`: Cache hit rate (if available)

## 🔧 **GraphQL Mutations**

### **Protected Mutations (Authentication Required)**

#### **Clear Cache (requires `admin:system` permission)**
```graphql
mutation {
  clearCache {
    success
    message
    timestamp
  }
}
```

**Response Fields:**
- `success`: Whether operation succeeded
- `message`: Human-readable result message
- `timestamp`: When operation was executed

#### **Invalidate Validator Cache (requires `admin:system` permission)**
```graphql
mutation {
  invalidateValidatorCache {
    success
    message
    timestamp
  }
}
```

**Response Fields:**
- `success`: Whether operation succeeded
- `message`: Human-readable result message
- `timestamp`: When operation was executed

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

## 💾 **Redis Caching**

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

## 🧪 **Testing Routes**

### **Health Check**
```bash
# Test system health
curl http://localhost:3007/health
```

### **Cache Status**
```bash
# Check cache statistics
curl http://localhost:3007/cache/status
```

### **GraphQL Queries**
```bash
# Test public validators query
curl -X POST http://localhost:3007/graphql \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"query { validators { id validatorPubkey } }\"}"

# Test protected users query (should fail without auth)
curl -X POST http://localhost:3007/graphql \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"query { users { id } }\"}"

# Test with admin token
curl -X POST http://localhost:3007/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d "{\"query\": \"query { systemStats { validatorCount } }\"}"
```

### **Rate Limiting Test**
```bash
# Make multiple rapid requests to test rate limiting
for i in {1..5}; do
  curl -X POST http://localhost:3007/graphql \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"query { validators { id } }\"}"
  echo "Request $i completed"
done
```

## 📱 **Client Integration Examples**

### **JavaScript/Node.js**
```javascript
const response = await fetch('http://localhost:3007/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <your-token>'
  },
  body: JSON.stringify({
    query: `
      query {
        validators {
          id
          validatorPubkey
          uptime
        }
      }
    `
  })
});

const data = await response.json();
```

### **Python**
```python
import requests

response = requests.post(
    'http://localhost:3007/graphql',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer <your-token>'
    },
    json={
        'query': '''
            query {
                validators {
                    id
                    validatorPubkey
                    uptime
                }
            }
        '''
    }
)

data = response.json()
```

### **cURL (Windows CMD)**
```cmd
curl -X POST http://localhost:3007/graphql ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <your-token>" ^
  -d "{\"query\": \"query { validators { id validatorPubkey } }\"}"
```

## 🚨 **Error Responses**

### **Authentication Error (401)**
```json
{
  "errors": [
    {
      "message": "Authentication required",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

### **Permission Error (403)**
```json
{
  "errors": [
    {
      "message": "Permission denied: admin:system required",
      "extensions": {
        "code": "FORBIDDEN"
      }
    }
  ]
}
```

### **Rate Limit Error (429)**
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 300
}
```

### **GraphQL Validation Error**
```json
{
  "errors": [
    {
      "message": "Cannot query field 'invalidField' on type 'Validator'",
      "locations": [
        {
          "line": 3,
          "column": 5
        }
      ],
      "extensions": {
        "code": "GRAPHQL_VALIDATION_FAILED"
      }
    }
  ]
}
```

## 📋 **Quick Reference**

### **Public Endpoints (No Auth)**
- `GET /health` - System health
- `GET /cache/status` - Cache statistics
- `POST /graphql` - Validators query only

### **Protected Endpoints (Auth Required)**
- `POST /cache/clear` - Clear cache (Admin only)
- `POST /graphql` - All other queries and mutations

### **Rate Limiting**
- All endpoints: 100 requests per 15 minutes per IP
- Excludes health check endpoint

### **Caching**
- GraphQL queries: 5-minute TTL
- Cache keys: `graphql:<query-hash>`
- Automatic expiration and cleanup

---

**📚 This routes reference covers all available endpoints in the Solana Staking Backend system. For detailed implementation and testing, refer to the main README.md file.**
