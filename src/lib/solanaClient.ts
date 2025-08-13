// src/lib/solanaClient.ts
import { Connection } from "@solana/web3.js";

const PRIMARY_RPC = process.env.SOLANA_RPC_PRIMARY || "https://api.mainnet-beta.solana.com";
const SECONDARY_RPC = process.env.SOLANA_RPC_SECONDARY || "https://rpc.helius.xyz/?api-key=demo";

export function getConnection(useSecondary = false) {
  const rpcUrl = useSecondary ? SECONDARY_RPC : PRIMARY_RPC;
  return new Connection(rpcUrl, {
    commitment: "confirmed",
    disableRetryOnRateLimit: true, // We handle retries ourselves
  });
}
