import {
  checkDarkdropRelayer,
  createDarkdropViaRelayer
} from "./darkdrop/relayer-create.js";

console.log("Checking DarkDrop relayer:");
console.log(await checkDarkdropRelayer());

const depositTx = process.env.DARKDROP_DEPOSIT_TX;

if (!depositTx) {
  console.log("\nNo DARKDROP_DEPOSIT_TX set, so not creating a real on-chain drop.");
  console.log("When ready, run:");
  console.log('DARKDROP_DEPOSIT_TX="YOUR_DEPOSIT_SIGNATURE" npm run darkdropRelayerSmoke');
  process.exit(0);
}

console.log("\nCreating real DarkDrop drop via relayer:");
const created = await createDarkdropViaRelayer({
  creatorId: "agent_a",
  amountSol: Number(process.env.DARKDROP_AMOUNT_SOL || "0.05"),
  depositTx,
  cluster: "devnet"
});

console.log({
  drop: created.drop,
  claimCodePrefix: created.claimCode.slice(0, 48) + "...",
  warning: created.warning,
  nextStep: created.nextStep
});
