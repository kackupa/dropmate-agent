import { randomUUID } from "node:crypto";
import {
  getDraft,
  insertDraft,
  insertReceipt,
  listDrafts,
  updateDraftStatus
} from "./db.js";
import { estimateSolPaymentFee, evaluatePaymentPolicy } from "./policy.js";

export function estimatePrivatePaymentFee(input: {
  amountSol: number;
  solUsdPrice?: number;
}) {
  return estimateSolPaymentFee(input.amountSol, input.solUsdPrice ?? 150);
}

export function prepareClaimCodePayment(input: {
  amountSol: number;
  recipient?: string;
  purpose: string;
  requestedBy?: string;
  solUsdPrice?: number;
}) {
  const policy = evaluatePaymentPolicy({
    amountSol: input.amountSol,
    purpose: input.purpose
  });

  const fee = estimateSolPaymentFee(input.amountSol, input.solUsdPrice ?? 150);
  const now = new Date().toISOString();

  const draft = {
    id: randomUUID(),
    amount_sol: input.amountSol,
    recipient: input.recipient || null,
    purpose: input.purpose,
    requested_by: input.requestedBy || "agent",
    status: policy.status,
    fee_usd: fee.feeUsd,
    policy_notes: policy.notes.join("\n"),
    created_at: now,
    updated_at: now
  };

  insertDraft(draft);

  return {
    draft,
    policy,
    fee,
    nextStep:
      policy.status === "blocked"
        ? "Request was blocked by policy."
        : "Draft created. Human approval/signing required before real DarkDrop execution."
  };
}

export function listPendingPayments() {
  return listDrafts("pending_approval");
}

export function approvePayment(input: { draftId: string }) {
  const draft = getDraft(input.draftId);

  if (!draft) {
    throw new Error("Draft not found.");
  }

  if (draft.status === "blocked") {
    throw new Error("Blocked drafts cannot be approved.");
  }

  updateDraftStatus(input.draftId, "approved");

  return {
    draftId: input.draftId,
    status: "approved",
    nextStep: "Ready for future wallet signing / DarkDrop execution."
  };
}

export function rejectPayment(input: { draftId: string; reason?: string }) {
  const draft = getDraft(input.draftId);

  if (!draft) {
    throw new Error("Draft not found.");
  }

  updateDraftStatus(input.draftId, "rejected");

  return {
    draftId: input.draftId,
    status: "rejected",
    reason: input.reason || "No reason provided."
  };
}

export function saveReceipt(input: {
  draftId?: string;
  txSignature?: string;
  claimCodePreview?: string;
  notes?: string;
}) {
  const id = randomUUID();

  insertReceipt({
    id,
    draft_id: input.draftId,
    tx_signature: input.txSignature,
    claim_code_preview: input.claimCodePreview,
    notes: input.notes
  });

  if (input.draftId) {
    const draft = getDraft(input.draftId);
    if (draft && draft.status === "approved") {
      updateDraftStatus(input.draftId, "executed");
    }
  }

  return {
    receiptId: id,
    status: "saved"
  };
}
