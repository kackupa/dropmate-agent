import {
  generateDarkDropClaimCode,
  inspectDarkDropClaimCodeForDevOnly
} from "./darkdrop/adapter.js";

console.log("Generating real DarkDrop-format claim code:");

const created = await generateDarkDropClaimCode({
  amountSol: 0.05,
  cluster: "devnet"
});

console.log({
  claimCodePrefix: created.claimCode.slice(0, 40) + "...",
  warning: created.warning,
  payloadForRelayer: created.darkdropPayload
});

console.log("\nInspecting generated claim code shape:");
console.log(await inspectDarkDropClaimCodeForDevOnly(created.claimCode));
