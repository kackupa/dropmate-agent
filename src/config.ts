import "dotenv/config";

export const config = {
  databasePath: process.env.DATABASE_PATH || "./data/dropmate-agent.sqlite",
  maxSinglePaymentSol: Number(process.env.MAX_SINGLE_PAYMENT_SOL || "0.25"),
  dailyLimitSol: Number(process.env.DAILY_LIMIT_SOL || "2"),
  approvalRequiredAboveSol: Number(process.env.APPROVAL_REQUIRED_ABOVE_SOL || "0.1"),
  frontendFeeBps: Number(process.env.FRONTEND_FEE_BPS || "10"),
  frontendFeeCapUsd: Number(process.env.FRONTEND_FEE_CAP_USD || "1"),
  solanaCluster: process.env.SOLANA_CLUSTER || "devnet",
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  darkdropRelayerUrl: process.env.DARKDROP_RELAYER_URL || "",
  darkdropProgramId: process.env.DARKDROP_PROGRAM_ID || ""
};
