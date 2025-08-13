

import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const prisma = new PrismaClient();
const logger = pino({ transport: { target: 'pino-pretty' } });

/**
 * Calculates TrustScore v1 for a given validator.
 * score = uptime - (commission ?? baselinePenalty)
 * Bound between 0 and 100.
 */
async function calculateScore(uptime: number, commission?: number): Promise<number> {
  const baselinePenalty = 5; // If commission is null/undefined
  let score = uptime - (commission ?? baselinePenalty);
  score = Math.max(0, Math.min(100, score)); // Clamp between 0–100
  return score;
}

async function runScoringForValidator(validatorId: string) {
  logger.info(`Starting scoring for validator ${validatorId}`);

  // Create a ScoringRun row
  const scoringRun = await prisma.scoringRun.create({
    data: {}
  });

  // Fetch validator details (you might already have uptime & commission in DB)
  const validator = await prisma.validator.findUnique({
    where: { id: validatorId }
  });

  if (!validator) {
    logger.error(`Validator ${validatorId} not found`);
    return;
  }

  // TODO: Replace these mock values with real data from your fetcher results
  const uptime = validator.uptime ?? 98; // Example default
  const commission = validator.commission ?? 10; // Example default

  const score = await calculateScore(uptime, commission);

  // Persist TrustScore
  await prisma.trustScore.create({
    data: {
      validatorId,
      score,
      scoringRunId: scoringRun.id
    }
  });

  logger.info(`Scoring complete: validator=${validatorId}, score=${score}`);
}

(async () => {
  try {
    // Replace with your test validator ID from Bit 1/2
    const testValidatorId = 'cme8um82a001suujcaqdudhtg';
    await runScoringForValidator(testValidatorId);
  } catch (err) {
    logger.error(err, 'Scoring worker failed');
  } finally {
    await prisma.$disconnect();
  }
})();
