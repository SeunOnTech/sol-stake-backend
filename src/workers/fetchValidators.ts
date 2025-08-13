// src/workers/fetchValidators.ts
import { Connection } from "@solana/web3.js";
import { prisma } from "../lib/prisma";
import { validatorSchema } from "../schemas/validatorSchema";
import pino from "pino";

const logger = pino({ transport: { target: "pino-pretty" } });

const PRIMARY_RPC = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const SECONDARY_RPC = process.env.SOLANA_RPC_SECONDARY || "https://rpc.helius.xyz/?api-key=demo";

// Helper: retry with exponential backoff
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 2, delayMs = 1000): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const isRateLimit = err?.message?.includes("429") || err?.message?.toLowerCase().includes("rate limit");

      logger.error({ attempt, err: err.message }, "Retry attempt failed");

      if (attempt > retries) throw err;

      const backoffTime = delayMs * Math.pow(2, attempt - 1);
      logger.warn(`Backing off for ${backoffTime}ms...`);
      await new Promise(res => setTimeout(res, backoffTime));

      if (isRateLimit && attempt === 1) {
        logger.warn("Rate limit detected, will try secondary RPC on next attempt...");
      }
    }
  }
}

async function fetchValidatorsFromRPC(rpcUrl: string) {
  const connection = new Connection(rpcUrl, "confirmed");
  logger.info(`Fetching all validators from ${rpcUrl}...`);
  const { current, delinquent } = await connection.getVoteAccounts();
  return [...current, ...delinquent];
}

async function fetchValidators() {
  try {
    let allValidators;

    try {
      allValidators = await retryWithBackoff(() => fetchValidatorsFromRPC(PRIMARY_RPC));
    } catch (err: any) {
      if (err.message?.includes("429") || err.message?.toLowerCase().includes("rate limit")) {
        logger.warn("Switching to secondary RPC due to rate limit...");
        allValidators = await retryWithBackoff(() => fetchValidatorsFromRPC(SECONDARY_RPC));
      } else {
        throw err;
      }
    }

    let successCount = 0;
    let failCount = 0;

    for (const v of allValidators) {
      try {
        const uptime =
          v.epochCredits && v.epochCredits.length > 0
            ? v.epochCredits[v.epochCredits.length - 1][1] / 100
            : v.activatedStake > 0
            ? 1
            : 0;

        const parsed = validatorSchema.parse({
          voteAccount: v.votePubkey,
          validatorPubkey: v.nodePubkey || v.votePubkey,
          commission: typeof v.commission === "number" ? v.commission : null,
          uptime,
          name: null,
        });

        await prisma.validator.upsert({
          where: { voteAccount: parsed.voteAccount },
          update: parsed,
          create: parsed,
        });

        successCount++;
      } catch (err) {
        failCount++;
        logger.error({ err, votePubkey: v.votePubkey }, "Validation or upsert failed");
      }
    }

    logger.info(`✅ Upserts complete — Success: ${successCount}, Failed: ${failCount}`);
  } catch (err: any) {
    logger.error({ error: err.message }, "❌ Critical fetch failure");
    await prisma.auditLog.create({
      data: {
        action: "VALIDATOR_FETCH_FAILED",
        actorId: null,
        metadata: { error: err.message, stack: err.stack },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export { fetchValidators };

// // src/workers/fetchValidators.ts
// import { Connection } from "@solana/web3.js";
// import { prisma } from "../lib/prisma";
// import { validatorSchema } from "../schemas/validatorSchema";
// import pino from "pino";

// const logger = pino({ transport: { target: "pino-pretty" } });

// const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

// async function fetchValidators() {
//   try {
//     const connection = new Connection(RPC_URL, "confirmed");
//     logger.info("Fetching all validators...");

//     const { current, delinquent } = await connection.getVoteAccounts();

//     // Merge all validators into one array
//     const allValidators = [...current, ...delinquent];

//     let successCount = 0;
//     let failCount = 0;

//     for (const v of allValidators) {
//       try {
//         // Minimal uptime estimation
//         const uptime =
//           v.epochCredits && v.epochCredits.length > 0
//             ? v.epochCredits[v.epochCredits.length - 1][1] / 100 // crude normalization
//             : v.activatedStake > 0
//             ? 1
//             : 0;

//         const parsed = validatorSchema.parse({
//           voteAccount: v.votePubkey,
//           validatorPubkey: v.nodePubkey || v.votePubkey, // fallback
//           commission: typeof v.commission === "number" ? v.commission : null,
//           uptime,
//           name: null, // placeholder until we fetch identity info
//         });

//         await prisma.validator.upsert({
//           where: { voteAccount: parsed.voteAccount },
//           update: parsed,
//           create: parsed,
//         });

//         successCount++;
//       } catch (err) {
//         failCount++;
//         logger.error({ err, votePubkey: v.votePubkey }, "Validation or upsert failed");
//       }
//     }

//     logger.info(`✅ Upserts complete — Success: ${successCount}, Failed: ${failCount}`);
//   } catch (err) {
//     logger.error(err, "❌ Fetch failed");
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// fetchValidators();
