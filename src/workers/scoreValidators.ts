// src/workers/scoreValidators.ts
import { prisma } from '../lib/prisma';
import pino from 'pino';

const logger = pino({ name: 'scoreValidators', level: 'info' });

export async function scoreValidatorsJob() {
  logger.info('Starting validator scoring...');

  const validators = await prisma.validator.findMany();
  if (!validators.length) {
    logger.warn('No validators found in DB.');
    return;
  }

  const scoringRun = await prisma.scoringRun.create({ data: {} });

  for (const v of validators) {
    const score = (v.uptime ?? 0) - (v.commission ?? 0);

    await prisma.trustScore.create({
      data: {
        validatorId: v.id,
        score,
        scoringRunId: scoringRun.id
      }
    });

    logger.info({ validatorPubkey: v.validatorPubkey, score }, 'Score saved');
  }

  logger.info('Scoring completed.');
}
// This job calculates trust scores based on uptime and commission,