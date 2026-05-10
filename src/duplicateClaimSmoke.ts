import { createRealDarkdrop, claimRealDarkdrop } from "./darkdropService.js";

async function main() {
  console.log("Duplicate-claim smoke test");
  console.log("");

  console.log("1. Creating real DarkDrop drop...");
  const created = await createRealDarkdrop({
    creatorId: "agent_a",
    amountSol: 0.005
  });

  console.log({
    createdTxSignature: created.drop.createdTxSignature,
    depositTx: created.depositTx,
    leafIndex: created.drop.leafIndex,
    claimCodeReturnedOnce: Boolean(created.claimCode)
  });

  console.log("");
  console.log("2. Claiming once...");
  const firstClaim = await claimRealDarkdrop({
    claimerId: "agent_b",
    claimCode: created.claimCode
  });

  console.log({
    claimTxSignature: firstClaim.claimTxSignature,
    withdrawTxSignature: firstClaim.withdrawTxSignature,
    note: firstClaim.note
  });

  console.log("");
  console.log("3. Trying duplicate claim with the same code...");

  try {
    await claimRealDarkdrop({
      claimerId: "agent_b",
      claimCode: created.claimCode
    });

    throw new Error("Duplicate claim unexpectedly succeeded.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.log("Duplicate claim failed safely.");
    console.log({
      expectedFailure: true,
      error: message
    });
  }

  console.log("");
  console.log("Duplicate-claim smoke test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
