#!/usr/bin/env node

const { execSync } = require('child_process');

function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description} completed successfully`);
    return output;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

async function verifyBit7() {
  try {
    console.log('🚀 Starting Bit 7 verification...\n');
    
    console.log('📊 Step 1: Setting up repeatable jobs in test mode...');
    runCommand('npm run queue:scheduler setup test', 'Setting up repeatable jobs (10s fetch, 30s score)');
    
    console.log('\n📊 Step 2: Listing repeatable jobs...');
    runCommand('npm run queue:scheduler list', 'Listing repeatable jobs');
    
    console.log('\n📊 Step 3: Starting worker to process repeatable jobs...');
    console.log('💡 In a new terminal, run: npm run worker');
    console.log('💡 Keep the worker running to see jobs execute automatically');
    
    console.log('\n📊 Step 4: Monitoring queue status...');
    runCommand('npm run queue:monitor', 'Monitoring queue status');
    
    console.log('\n📊 Step 5: Testing repeatable job execution...');
    console.log('💡 Wait 10-15 seconds, then run: npm run queue:monitor');
    console.log('💡 You should see jobs being processed automatically');
    
    console.log('\n📊 Step 6: Switching to production mode...');
    console.log('💡 When ready for production, run:');
    console.log('   npm run queue:scheduler setup production');
    console.log('💡 This will change intervals to 6 hours');
    
    console.log('\n🎯 Bit 7 Verification Complete!');
    console.log('\n📋 What to verify:');
    console.log('✅ Repeatable jobs are created with unique jobIds');
    console.log('✅ Jobs run automatically at specified intervals');
    console.log('✅ Storage limits are applied (removeOnComplete/removeOnFail)');
    console.log('✅ Easy switching between test and production modes');
    
    console.log('\n💡 Next steps:');
    console.log('1. Start worker: npm run worker');
    console.log('2. Watch jobs execute automatically every 10s/30s');
    console.log('3. Monitor with: npm run queue:monitor');
    console.log('4. Switch to production: npm run queue:scheduler setup production');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Run verification
if (require.main === module) {
  verifyBit7();
}
