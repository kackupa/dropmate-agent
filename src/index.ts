import {
  approvePayment,
  estimatePrivatePaymentFee,
  listPendingPayments,
  prepareClaimCodePayment,
  saveReceipt
} from "./tools.js";

console.log("DropMate Agent local test");

console.log("\nFee estimate:");
console.log(
  estimatePrivatePaymentFee({
    amountSol: 0.05,
    solUsdPrice: 150
  })
);

console.log("\nPrepare draft:");
const draft = prepareClaimCodePayment({
  amountSol: 0.05,
  recipient: "demo-recipient-wallet",
  purpose: "Demo private agent payment",
  requestedBy: "local-test-agent",
  solUsdPrice: 150
});

console.log(draft);

console.log("\nPending payments:");
console.log(listPendingPayments());

console.log("\nApprove draft:");
console.log(approvePayment({ draftId: draft.draft.id }));

console.log("\nSave receipt:");
console.log(
  saveReceipt({
    draftId: draft.draft.id,
    txSignature: "demo-signature",
    claimCodePreview: "demo-code-preview",
    notes: "Local index test receipt."
  })
);

console.log("\nDropMate Agent local test complete");
