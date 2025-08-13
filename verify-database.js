#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyDatabase() {
  try {
    console.log('🔍 Database Verification for Bit 9...\n');
    
    // 1. Check Validators table
    console.log('📊 Validators Table:');
    console.log('====================');
    
    const validatorCount = await prisma.validator.count();
    console.log(`Total validators: ${validatorCount}`);
    
    if (validatorCount > 0) {
      const sampleValidator = await prisma.validator.findFirst({
        select: {
          id: true,
          validatorPubkey: true,
          voteAccount: true,
          commission: true,
          uptime: true,
          updatedAt: true
        }
      });
      
      console.log('\nSample validator:');
      console.log(`  ID: ${sampleValidator.id}`);
      console.log(`  Pubkey: ${sampleValidator.validatorPubkey}`);
      console.log(`  Vote Account: ${sampleValidator.voteAccount}`);
      console.log(`  Commission: ${sampleValidator.commission}%`);
      console.log(`  Uptime: ${sampleValidator.uptime}%`);
      console.log(`  Last Updated: ${sampleValidator.updatedAt}`);
      
      // Check required fields
      const hasRequiredFields = sampleValidator.validatorPubkey && 
                               sampleValidator.voteAccount && 
                               sampleValidator.commission !== null && 
                               sampleValidator.uptime !== null;
      
      console.log(`\n✅ Required fields present: ${hasRequiredFields ? 'YES' : 'NO'}`);
    }
    
    // 2. Check ScoringRun table
    console.log('\n📈 ScoringRun Table:');
    console.log('====================');
    
    const scoringRunCount = await prisma.scoringRun.count();
    console.log(`Total scoring runs: ${scoringRunCount}`);
    
    if (scoringRunCount > 0) {
      const latestScoringRun = await prisma.scoringRun.findFirst({
        orderBy: { runDate: 'desc' },
        select: {
          id: true,
          runDate: true
          // Note: These fields will be available after schema update:
          // status: true,
          // validatorCount: true,
          // successCount: true,
          // failCount: true
        }
      });
      
      console.log('\nLatest scoring run:');
      console.log(`  ID: ${latestScoringRun.id}`);
      console.log(`  Run Date: ${latestScoringRun.runDate}`);
      // console.log(`  Status: ${latestScoringRun.status}`);
      // console.log(`  Validators: ${latestScoringRun.validatorCount}`);
      // console.log(`  Success: ${latestScoringRun.successCount}`);
      // console.log(`  Failed: ${latestScoringRun.failCount}`);
    }
    
    // 3. Check TrustScore table
    console.log('\n🎯 TrustScore Table:');
    console.log('====================');
    
    const trustScoreCount = await prisma.trustScore.count();
    console.log(`Total trust scores: ${trustScoreCount}`);
    
    if (trustScoreCount > 0) {
      const latestTrustScores = await prisma.trustScore.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          score: true,
          createdAt: true,
          scoringRunId: true,
          validatorId: true
        },
        include: {
          validator: {
            select: {
              validatorPubkey: true
            }
          }
        }
      });
      
      console.log('\nLatest 5 trust scores:');
      latestTrustScores.forEach((ts, index) => {
        console.log(`  ${index + 1}. Score: ${ts.score}, Validator: ${ts.validator.validatorPubkey}, Run: ${ts.scoringRunId}`);
      });
      
      // Check if TrustScores reference ScoringRuns
      const orphanedTrustScores = await prisma.trustScore.count({
        where: {
          scoringRunId: null
        }
      });
      
      console.log(`\n✅ TrustScores with ScoringRun references: ${trustScoreCount - orphanedTrustScores}/${trustScoreCount}`);
    }
    
    // 4. Check data relationships
    console.log('\n🔗 Data Relationships:');
    console.log('======================');
    
    if (validatorCount > 0 && scoringRunCount > 0 && trustScoreCount > 0) {
      // Check if we have TrustScores for the latest ScoringRun
      const latestRun = await prisma.scoringRun.findFirst({
        orderBy: { runDate: 'desc' }
      });
      
      const trustScoresForLatestRun = await prisma.trustScore.count({
        where: {
          scoringRunId: latestRun.id
        }
      });
      
      console.log(`TrustScores for latest run: ${trustScoresForLatestRun}`);
      console.log(`Expected (should be close to validator count): ${validatorCount}`);
      
      const coverage = ((trustScoresForLatestRun / validatorCount) * 100).toFixed(1);
      console.log(`Coverage: ${coverage}%`);
      
      if (coverage >= 90) {
        console.log('✅ Excellent coverage!');
      } else if (coverage >= 80) {
        console.log('⚠️ Good coverage, but some validators may have failed');
      } else {
        console.log('❌ Low coverage - check for scoring errors');
      }
    }
    
    // 5. Check recent activity
    console.log('\n⏰ Recent Activity:');
    console.log('==================');
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentValidators = await prisma.validator.count({
      where: {
        updatedAt: {
          gte: oneHourAgo
        }
      }
    });
    
    const recentScoringRuns = await prisma.scoringRun.count({
      where: {
        runDate: {
          gte: oneHourAgo
        }
      }
    });
    
    const recentTrustScores = await prisma.trustScore.count({
      where: {
        createdAt: {
          gte: oneHourAgo
        }
      }
    });
    
    console.log(`Validators updated in last hour: ${recentValidators}`);
    console.log(`Scoring runs in last hour: ${recentScoringRuns}`);
    console.log(`Trust scores created in last hour: ${recentTrustScores}`);
    
    // 6. Summary and acceptance criteria
    console.log('\n🎯 Acceptance Criteria Summary:');
    console.log('================================');
    
    const criteria = {
      validatorsPopulated: validatorCount > 0,
      validatorsHaveRequiredFields: validatorCount > 0 && (await prisma.validator.count({
        where: {
          validatorPubkey: { not: null },
          voteAccount: { not: null },
          commission: { not: null },
          uptime: { not: null }
        }
      })) > 0,
      scoringRunCreated: scoringRunCount > 0,
      trustScoresExist: trustScoreCount > 0,
      trustScoresReferenceScoringRun: trustScoreCount > 0 && (await prisma.trustScore.count({
        where: { scoringRunId: { not: null } }
      })) > 0,
      recentActivity: recentValidators > 0 || recentScoringRuns > 0 || recentTrustScores > 0
    };
    
    console.log(`☐ Validators persisted in DB: ${criteria.validatorsPopulated ? '✅' : '❌'}`);
    console.log(`☐ Validators have correct fields: ${criteria.validatorsHaveRequiredFields ? '✅' : '❌'}`);
    console.log(`☐ ScoringRun created: ${criteria.scoringRunCreated ? '✅' : '❌'}`);
    console.log(`☐ TrustScore rows exist: ${criteria.trustScoresExist ? '✅' : '❌'}`);
    console.log(`☐ TrustScores reference ScoringRun: ${criteria.trustScoresReferenceScoringRun ? '✅' : '❌'}`);
    console.log(`☐ Recent activity detected: ${criteria.recentActivity ? '✅' : '❌'}`);
    
    const allCriteriaMet = Object.values(criteria).every(Boolean);
    console.log(`\n🎉 All acceptance criteria met: ${allCriteriaMet ? 'YES' : 'NO'}`);
    
    if (allCriteriaMet) {
      console.log('\n🚀 Database verification PASSED! System is ready for production.');
    } else {
      console.log('\n⚠️ Some criteria not met. Check the details above.');
    }
    
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  verifyDatabase();
}
