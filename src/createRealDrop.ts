import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import { createDarkdropViaRelayer } from "./darkdrop/relayer-create.js";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const RELAYER_URL = process.env.DARKDROP_RELAYER_URL || "http://localhost:3001";
const AGENT_KEYPAIR_PATH = process.env.AGENT_KEYPAIR_PATH || "./data/agent-a-devnet.json";
const AMOUNT_SOL = Number(process.env.DARKDROP_AMOUNT_SOL || "0.05");

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
  const connection = new Connection(RPC_URL, "confirmed");
  const agent = loadOrCreateKeypair(AGENT_KEYPAIR_PATH);

  const health = await fetch(`${RELAYER_URL}/health`).then((r) => r.json());
  const relayerPubkey = new PublicKey(health.relayerPubkey);

  const lamports = Math.round(AMOUNT_SOL * LAMPORTS_PER_SOL);

  console.log("Agent wallet:", agent.publicKey.toBase58());
  console.log("Relayer wallet:", relayerPubkey.toBase58());
  console.log("Amount:", AMOUNT_SOL, "SOL");

  const balance = await connection.getBalance(agent.publicKey);
  console.log("Agent balance:", balance / LAMPORTS_PER_SOL, "SOL");

  if (balance < lamports + 0.01 * LAMPORTS_PER_SOL) {
    throw new Error("Agent wallet needs more devnet SOL before creating a real drop.");
  }

  const depositTxObj = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: agent.publicKey,
      toPubkey: relayerPubkey,
      lamports
    })
  );

  const depositTx = await sendAndConfirmTransaction(connection, depositTxObj, [agent], {
    commitment: "confirmed"
  });

  console.log("Deposit tx:", depositTx);

  const created = await createDarkdropViaRelayer({
    creatorId: "agent_a",
    amountSol: AMOUNT_SOL,
    depositTx,
    relayerUrl: RELAYER_URL,
    rpcUrl: RPC_URL,
    cluster: "devnet"
  });

  console.log("");
  console.log("REAL DARKDROP DROP CREATED");
  console.log("Created tx:", created.drop.createdTxSignature);
  console.log("Leaf index:", created.drop.leafIndex);
  console.log("");
  console.log("FULL CLAIM CODE - returned once only:");
  console.log(created.claimCode);
  console.log("");
  console.log("Do not store this in DropMate. Send it through a separate secure channel.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
