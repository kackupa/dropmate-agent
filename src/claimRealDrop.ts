import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { Keypair } from "@solana/web3.js";
import { claimDarkdropViaRelayer } from "./darkdrop/relayer-claim.js";

const CLAIM_CODE = process.env.CLAIM_CODE || "";
const AGENT_B_KEYPAIR_PATH = process.env.AGENT_B_KEYPAIR_PATH || "./data/agent-b-devnet.json";

function loadOrCreateKeypair(path: string) {
  mkdirSync(dirname(path), { recursive: true });

  if (existsSync(path)) {
    const secret = JSON.parse(readFileSync(path, "utf8"));
    return Keypair.fromSecretKey(new Uint8Array(secret));
  }

  const kp = Keypair.generate();
  writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)));
  return kp;
}

async function main() {
  if (!CLAIM_CODE) {
    throw new Error("CLAIM_CODE env var is required.");
  }

  const agentB = loadOrCreateKeypair(AGENT_B_KEYPAIR_PATH);

  console.log("Agent B recipient wallet:", agentB.publicKey.toBase58());
  console.log("Claiming real DarkDrop code via relayer...");

  const result = await claimDarkdropViaRelayer({
    claimerId: "agent_b",
    claimCode: CLAIM_CODE,
    recipientAddress: agentB.publicKey.toBase58()
  });

  console.log("");
  console.log("REAL DARKDROP DROP CLAIMED");
  console.log(result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
