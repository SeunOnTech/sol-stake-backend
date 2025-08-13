#!/usr/bin/env node

const { authService } = require('./auth');

/**
 * Generate test JWT tokens for different user roles
 * This is for testing purposes only - remove in production
 */

async function generateTestTokens() {
  console.log('🔐 Generating Test JWT Tokens...\n');

  try {
    // Generate tokens for different roles
    const viewerToken = authService.generateMockToken('viewer');
    const userToken = authService.generateMockToken('user');
    const adminToken = authService.generateMockToken('admin');

    console.log('📋 Test JWT Tokens Generated:\n');

    console.log('👁️  Viewer Role Token:');
    console.log(`Bearer ${viewerToken}\n`);

    console.log('👤 User Role Token:');
    console.log(`Bearer ${userToken}\n`);

    console.log('👑 Admin Role Token:');
    console.log(`Bearer ${adminToken}\n`);

    console.log('💡 Usage Examples:');
    console.log('1. Test protected endpoints:');
    console.log(`   curl -H "Authorization: Bearer ${adminToken}" http://localhost:3007/graphql`);
    
    console.log('\n2. Test GraphQL with auth:');
    console.log(`   curl -X POST http://localhost:3007/graphql \\
     -H "Content-Type: application/json" \\
     -H "Authorization: Bearer ${userToken}" \\
     -d '{"query": "query { users { id } }"}'`);

    console.log('\n3. Test admin endpoints:');
    console.log(`   curl -X POST http://localhost:3007/graphql \\
     -H "Content-Type: application/json" \\
     -H "Authorization: Bearer ${adminToken}" \\
     -d '{"query": "query { systemStats { validatorCount } }"}'`);

    console.log('\n⚠️  Important Notes:');
    console.log('- These are MOCK tokens for testing only');
    console.log('- Remove this script in production');
    console.log('- Use real authentication in production');
    console.log('- Tokens expire in 24 hours by default');

  } catch (error) {
    console.error('❌ Error generating test tokens:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  generateTestTokens();
}
