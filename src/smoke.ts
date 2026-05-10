import {
  approvePayment,
  estimatePrivatePaymentFee,
  listPendingPayments,
  prepareClaimCodePayment,
  saveReceipt
} from "./tools.js";

console.log("Fee estimate:");
console.log(
  estimatePrivatePaymentFee({
    amountSol: 0.05,
    solUsdPrice: 150
  })
);

console.log("\nPreparing payment draft:");
const prepared = prepareClaimCodePayment({
  amountSol: 0.05,
  recipient: "demo-recipient-wallet",
  purpose: "Demo private agent payment",
  requestedBy: "smoke-test-agent",
  solUsdPrice: 150
});

console.log(prepared);

console.log("\nPending:");
console.log(listPendingPayments());

console.log("\nApproving:");
console.log(approvePayment({ draftId: prepared.draft.id }));

console.log("\nSaving receipt:");
console.log(
  saveReceipt({
    draftId: prepared.draft.id,
    txSignature: "demo-signature",
    claimCodePreview: "demo-code-preview",
    notes: "Smoke test receipt only."
  })
);
