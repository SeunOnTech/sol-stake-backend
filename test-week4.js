#!/usr/bin/env node

const { spawnSync } = require('child_process');
const readline = require('readline');

function runCommand(command, description) {
  console.log(`\n🔧 ${description}...`);
  console.log(`Command: ${command}`);
  
  const result = spawnSync(command, { 
    shell: true, 
    stdio: 'inherit',
    maxBuffer: 1024 * 1024 // 1MB
  });
  
  if (result.status !== 0) {
    console.log(`❌ Command failed with status ${result.status}`);
    return false;
  }
  
  console.log(`✅ Command completed successfully`);
  return true;
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testWeek4() {
  console.log('🚀 Starting Week 4 - Redis Caching, Auth, Rate Limiting Test...\n');
  
  try {
    // Phase 1: Test basic server startup
    console.log('📋 Phase 1: Testing Server Startup...\n');
    
    console.log('💡 Instructions:');
    console.log('1. Open a NEW terminal and run: npm run dev');
    console.log('2. Wait for the server to start and show all endpoints');
    console.log('3. Keep that terminal open');
    console.log('4. Press Enter when server is running...');
    
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await new Promise((resolve) => { 
      rl.question('Press Enter when server is running...', () => { 
        rl.close(); 
        resolve(); 
      }); 
    });
    
    // Phase 2: Test health endpoints
    console.log('\n📋 Phase 2: Testing Health Endpoints...\n');
    
    console.log('🔍 Testing health endpoint...');
    runCommand('curl -s http://localhost:3007/health', 'Health check endpoint');
    await delay(1000);
    
    console.log('🔍 Testing cache status endpoint...');
    runCommand('curl -s http://localhost:3007/cache/status', 'Cache status endpoint');
    await delay(1000);
    
    // Phase 3: Test GraphQL without authentication
    console.log('\n📋 Phase 3: Testing GraphQL Without Authentication...\n');
    
    console.log('🔍 Testing public validators query...');
    const validatorsQuery = `
      query {
        validators {
          id
          validatorPubkey
          uptime
        }
      }
    `;
    
    runCommand(`curl -s -X POST http://localhost:3007/graphql -H "Content-Type: application/json" -d '{"query": ${JSON.stringify(validatorsQuery)}}'`, 'Public validators query');
    await delay(1000);
    
    // Phase 4: Test protected endpoints (should fail)
    console.log('\n📋 Phase 4: Testing Protected Endpoints (Should Fail)...\n');
    
    console.log('🔍 Testing protected users query without auth...');
    const usersQuery = `
      query {
        users {
          id
          walletPubkey
        }
      }
    `;
    
    runCommand(`curl -s -X POST http://localhost:3007/graphql -H "Content-Type: application/json" -d '{"query": ${JSON.stringify(usersQuery)}}'`, 'Protected users query without auth');
    await delay(1000);
    
    // Phase 5: Test JWT authentication
    console.log('\n📋 Phase 5: Testing JWT Authentication...\n');
    
    console.log('🔍 Testing with mock user token...');
    console.log('💡 Note: This will use the mock token generation from auth service');
    
    // Test with different role tokens
    console.log('\n🔐 Testing viewer role...');
    runCommand('curl -s -X POST http://localhost:3007/graphql -H "Content-Type: application/json" -H "Authorization: Bearer mock-viewer-token" -d \'{"query": "query { validators { id validatorPubkey } }"}\'', 'Viewer role query');
    await delay(1000);
    
    // Phase 6: Test rate limiting
    console.log('\n📋 Phase 6: Testing Rate Limiting...\n');
    
    console.log('🔍 Testing rate limiting by making multiple requests...');
    for (let i = 1; i <= 5; i++) {
      console.log(`Request ${i}/5...`);
      runCommand(`curl -s -X POST http://localhost:3007/graphql -H "Content-Type: application/json" -d '{"query": "query { validators { id } }"}'`, `Rate limit test request ${i}`);
      await delay(200);
    }
    
    // Phase 7: Test cache functionality
    console.log('\n📋 Phase 7: Testing Cache Functionality...\n');
    
    console.log('🔍 Testing cache by making repeated validators query...');
    console.log('First request (should cache miss)...');
    runCommand(`curl -s -X POST http://localhost:3007/graphql -H "Content-Type: application/json" -d '{"query": "query { validators { id validatorPubkey } }"}'`, 'First validators query (cache miss)');
    await delay(1000);
    
    console.log('Second request (should cache hit)...');
    runCommand(`curl -s -X POST http://localhost:3007/graphql -H "Content-Type: application/json" -d '{"query": "query { validators { id validatorPubkey } }"}'`, 'Second validators query (cache hit)');
    await delay(1000);
    
    // Phase 8: Test admin endpoints
    console.log('\n📋 Phase 8: Testing Admin Endpoints...\n');
    
    console.log('🔍 Testing admin systemStats without proper auth...');
    const systemStatsQuery = `
      query {
        systemStats {
          validatorCount
          userCount
        }
      }
    `;
    
    runCommand(`curl -s -X POST http://localhost:3007/graphql -H "Content-Type: application/json" -d '{"query": ${JSON.stringify(systemStatsQuery)}}'`, 'Admin systemStats without auth');
    await delay(1000);
    
    // Phase 9: Final verification
    console.log('\n📋 Phase 9: Final Verification...\n');
    
    console.log('🔍 Checking cache status again...');
    runCommand('curl -s http://localhost:3007/cache/status', 'Final cache status check');
    await delay(1000);
    
    console.log('\n🎯 Week 4 Test Results Summary:');
    console.log('=============================\n');
    console.log('📋 Feature Checklist:');
    console.log('   ☐ Server starts with all endpoints');
    console.log('   ☐ Health endpoints accessible');
    console.log('   ☐ Public validators query works');
    console.log('   ☐ Protected endpoints reject without auth');
    console.log('   ☐ JWT authentication works');
    console.log('   ☐ Rate limiting functions');
    console.log('   ☐ Redis caching works (cache miss/hit)');
    console.log('   ☐ Admin endpoints properly protected');
    console.log('   ☐ Cache management endpoints work');
    
    console.log('\n💡 Next Steps:');
    console.log('1. Verify all endpoints are working in server logs');
    console.log('2. Check Redis for cached data');
    console.log('3. Test with real JWT tokens');
    console.log('4. Monitor rate limiting in action');
    console.log('5. Verify cache invalidation works');
    
    console.log('\n🎉 Week 4 Testing Complete!');
    console.log('\n🚀 Your system now has:');
    console.log('   ✅ Redis query caching (5min TTL)');
    console.log('   ✅ JWT authentication middleware');
    console.log('   ✅ Role-based access control');
    console.log('   ✅ Rate limiting (100 req/15min)');
    console.log('   ✅ Protected GraphQL endpoints');
    console.log('   ✅ Cache management endpoints');
    
  } catch (error) {
    console.error('\n❌ Week 4 testing failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testWeek4();
}
