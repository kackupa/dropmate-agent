import { claimDrop, createDrop, getRecentDrops } from "./dropTools.js";

console.log("Creating fake dev drop:");
const created = createDrop({
  creatorId: "agent_a",
  amountSol: 0.05,
  recipientHint: "agent_b",
  purpose: "Agent-to-agent demo task payment",
  solUsdPrice: 150
});

console.log(created);

console.log("\nClaiming fake dev drop:");
const claimed = claimDrop({
  claimerId: "agent_b",
  claimCode: created.claimCode
});

console.log(claimed);

console.log("\nRecent drops:");
console.log(getRecentDrops());
