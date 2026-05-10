import { config } from "./config.js";

export function estimateFrontendFeeUsd(amountUsd: number) {
  const fee = amountUsd * (config.frontendFeeBps / 10_000);
  return Math.min(fee, config.frontendFeeCapUsd);
}

export function estimateSolPaymentFee(amountSol: number, solUsdPrice = 150) {
  const amountUsd = amountSol * solUsdPrice;

  return {
    amountUsd,
    feeUsd: estimateFrontendFeeUsd(amountUsd),
    feeModel: `${config.frontendFeeBps / 100}% capped at $${config.frontendFeeCapUsd}`
  };
}

export function evaluatePaymentPolicy(input: {
  amountSol: number;
  purpose: string;
}) {
  const notes: string[] = [];

  if (!Number.isFinite(input.amountSol) || input.amountSol <= 0) {
    return {
      status: "blocked" as const,
      notes: ["Amount must be greater than 0."]
    };
  }

  if (input.amountSol > config.maxSinglePaymentSol) {
    return {
      status: "blocked" as const,
      notes: [
        `Blocked: amount ${input.amountSol} SOL exceeds max single payment of ${config.maxSinglePaymentSol} SOL.`
      ]
    };
  }

  if (!input.purpose || input.purpose.trim().length < 3) {
    return {
      status: "blocked" as const,
      notes: ["Blocked: purpose is required."]
    };
  }

  if (input.amountSol > config.approvalRequiredAboveSol) {
    notes.push(
      `Human approval required: amount is above ${config.approvalRequiredAboveSol} SOL.`
    );

    return {
      status: "pending_approval" as const,
      notes
    };
  }

  notes.push("Within auto-approval threshold, but still saved as a draft in V0.");

  return {
    status: "pending_approval" as const,
    notes
  };
}
