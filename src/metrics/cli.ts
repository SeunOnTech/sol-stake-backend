#!/usr/bin/env ts-node

import { collectSystemMetrics, formatPrometheusMetrics, logMetricsSummary } from './metrics';
import pino from 'pino';

const logger = pino({
  name: 'metrics-cli',
  level: 'info',
  transport: { target: 'pino-pretty' }
});

/**
 * Metrics CLI Tool
 * 
 * Provides command-line access to system metrics:
 * - summary: Human-readable metrics summary
 * - prometheus: Prometheus-formatted metrics
 * - health: System health check
 */

async function showMetricsSummary() {
  try {
    logger.info('📊 Collecting system metrics...');
    const metrics = await collectSystemMetrics();
    
    console.log('\n🔍 System Metrics Summary');
    console.log('==========================');
    console.log(`Timestamp: ${metrics.timestamp}`);
    
    console.log('\n📋 Queue Status:');
    console.log(`  Waiting: ${metrics.queue.waiting}`);
    console.log(`  Active: ${metrics.queue.active}`);
    console.log(`  Completed: ${metrics.queue.completed}`);
    console.log(`  Failed: ${metrics.queue.failed}`);
    console.log(`  Delayed: ${metrics.queue.delayed}`);
    
    console.log('\n🚀 Job Performance:');
    console.log(`  Fetch Jobs:`);
    console.log(`    Total: ${metrics.jobs.fetch.total}`);
    console.log(`    Errors: ${metrics.jobs.fetch.errors}`);
    console.log(`    Success Rate: ${(100 - metrics.jobs.fetch.successRate).toFixed(1)}%`);
    console.log(`    Avg Duration: ${metrics.jobs.fetch.avgDuration.toFixed(0)}ms`);
    
    console.log(`  Score Jobs:`);
    console.log(`    Total: ${metrics.jobs.score.total}`);
    console.log(`    Errors: ${metrics.jobs.score.errors}`);
    console.log(`    Success Rate: ${(100 - metrics.jobs.score.successRate).toFixed(1)}%`);
    console.log(`    Avg Duration: ${metrics.jobs.score.avgDuration.toFixed(0)}ms`);
    
    console.log('\n🗄️ Database:');
    console.log(`  Validators: ${metrics.database.validators}`);
    console.log(`  Trust Scores: ${metrics.database.trustScores}`);
    console.log(`  Scoring Runs: ${metrics.database.scoringRuns}`);
    console.log(`  Audit Logs: ${metrics.database.auditLogs}`);
    
    console.log('\n🔴 Redis:');
    console.log(`  Status: ${metrics.redis.connected ? 'Connected' : 'Disconnected'}`);
    if (metrics.redis.memoryUsage) {
      console.log(`  Memory Usage: ${metrics.redis.memoryUsage} bytes`);
    }
    
    // Log structured summary
    logMetricsSummary(metrics);
    
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, '❌ Failed to show metrics summary');
  }
}

async function showPrometheusMetrics() {
  try {
    logger.info('📊 Collecting Prometheus metrics...');
    const metrics = await collectSystemMetrics();
    const prometheusFormat = formatPrometheusMetrics(metrics);
    
    console.log('\n📈 Prometheus Metrics');
    console.log('======================');
    console.log(prometheusFormat);
    
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, '❌ Failed to show Prometheus metrics');
  }
}

async function checkSystemHealth() {
  try {
    logger.info('🏥 Performing system health check...');
    const metrics = await collectSystemMetrics();
    
    console.log('\n🏥 System Health Check');
    console.log('======================');
    
    let overallHealth = '✅ HEALTHY';
    const issues: string[] = [];
    
    // Check queue health
    if (metrics.queue.failed > 0) {
      issues.push(`⚠️  ${metrics.queue.failed} failed jobs in queue`);
    }
    
    if (metrics.queue.waiting > 10) {
      issues.push(`⚠️  High queue backlog: ${metrics.queue.waiting} waiting jobs`);
    }
    
    // Check job success rates
    if (metrics.jobs.fetch.successRate > 10) {
      issues.push(`❌ Fetch job error rate too high: ${metrics.jobs.fetch.successRate.toFixed(1)}%`);
    }
    
    if (metrics.jobs.score.successRate > 10) {
      issues.push(`❌ Score job error rate too high: ${metrics.jobs.score.successRate.toFixed(1)}%`);
    }
    
    // Check Redis health
    if (!metrics.redis.connected) {
      issues.push('❌ Redis connection failed');
    }
    
    // Check database health
    if (metrics.database.validators === 0) {
      issues.push('⚠️  No validators in database');
    }
    
    if (metrics.database.trustScores === 0) {
      issues.push('⚠️  No trust scores in database');
    }
    
    // Determine overall health
    if (issues.length > 0) {
      overallHealth = '❌ UNHEALTHY';
      if (issues.length <= 2) {
        overallHealth = '⚠️  DEGRADED';
      }
    }
    
    console.log(`Overall Status: ${overallHealth}`);
    
    if (issues.length === 0) {
      console.log('✅ All systems operational');
    } else {
      console.log('\nIssues Found:');
      issues.forEach(issue => console.log(`  ${issue}`));
    }
    
    // Recommendations
    if (issues.length > 0) {
      console.log('\n💡 Recommendations:');
      if (metrics.queue.failed > 0) {
        console.log('  - Check failed jobs: npm run queue:monitor');
        console.log('  - Review worker logs for error details');
      }
      if (metrics.jobs.fetch.successRate > 10 || metrics.jobs.score.successRate > 10) {
        console.log('  - Investigate job failures in worker logs');
        console.log('  - Check database connectivity and Solana RPC');
      }
      if (!metrics.redis.connected) {
        console.log('  - Check Redis connection and configuration');
      }
    }
    
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, '❌ Failed to perform health check');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'summary';

  try {
    switch (command) {
      case 'summary':
        await showMetricsSummary();
        break;
        
      case 'prometheus':
        await showPrometheusMetrics();
        break;
        
      case 'health':
        await checkSystemHealth();
        break;
        
      case 'help':
        console.log(`
📊 Metrics CLI Tool

Usage: ts-node src/metrics/cli.ts [command]

Commands:
  summary     - Show human-readable metrics summary (default)
  prometheus  - Show Prometheus-formatted metrics
  health      - Perform system health check
  help        - Show this help message

Examples:
  ts-node src/metrics/cli.ts summary
  ts-node src/metrics/cli.ts prometheus
  ts-node src/metrics/cli.ts health
        `);
        break;
        
      default:
        logger.error(`❌ Unknown command: ${command}`);
        logger.info('💡 Use "help" command to see available options');
        process.exit(1);
    }

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Metrics CLI failed');
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Metrics CLI failed');
    process.exit(1);
  });
}

export { showMetricsSummary, showPrometheusMetrics, checkSystemHealth };
