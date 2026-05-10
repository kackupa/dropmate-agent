import {
  findDropByClaimCode,
  hashClaimCode,
  insertDrop,
  listRecentDrops,
  makeClaimCode,
  markDropClaimed
} from "./dropStore.js";
import { estimateSolPaymentFee } from "./policy.js";

export function estimateDropFee(input: {
  amountSol: number;
  solUsdPrice?: number;
}) {
  return estimateSolPaymentFee(input.amountSol, input.solUsdPrice ?? 150);
}

export function createDrop(input: {
  creatorId: string;
  amountSol: number;
  recipientHint?: string;
  purpose?: string;
  solUsdPrice?: number;
}) {
  if (!input.creatorId || input.creatorId.trim().length < 2) {
    throw new Error("creatorId is required.");
  }

  if (!Number.isFinite(input.amountSol) || input.amountSol <= 0) {
    throw new Error("amountSol must be greater than 0.");
  }

  const claimCode = makeClaimCode();
  const drop = insertDrop({
    creatorId: input.creatorId,
    recipientHint: input.recipientHint,
    amountSol: input.amountSol,
    purpose: input.purpose,
    claimCodeHash: hashClaimCode(claimCode)
  });

  return {
    drop: {
      id: drop.id,
      creatorId: drop.creator_id,
      recipientHint: drop.recipient_hint,
      amountSol: drop.amount_sol,
      purpose: drop.purpose,
      status: drop.status,
      createdTxSignature: drop.created_tx_signature,
      createdAt: drop.created_at
    },
    claimCode,
    warning: "Claim code is returned once only. DropMate does not store plaintext claim codes.",
    fee: estimateDropFee({
      amountSol: input.amountSol,
      solUsdPrice: input.solUsdPrice
    }),
    nextStep: "Send the claim code to the recipient through a separate secure channel."
  };
}

export function claimDrop(input: {
  claimerId: string;
  claimCode: string;
}) {
  if (!input.claimerId || input.claimerId.trim().length < 2) {
    throw new Error("claimerId is required.");
  }

  if (!input.claimCode || input.claimCode.trim().length < 10) {
    throw new Error("claimCode is required.");
  }

  const drop = findDropByClaimCode(input.claimCode);

  if (!drop) {
    throw new Error("No matching drop found for this claim code.");
  }

  if (drop.status === "claimed") {
    throw new Error("Drop has already been claimed.");
  }

  const claimed = markDropClaimed(drop.id);

  return {
    dropId: drop.id,
    claimerId: input.claimerId,
    status: "claimed",
    amountSol: drop.amount_sol,
    claimedTxSignature: claimed.claimedTxSignature,
    claimedAt: claimed.claimedAt,
    note: "Claim code was used in memory and not stored."
  };
}

export function getRecentDrops() {
  return {
    drops: listRecentDrops()
  };
}
