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
  const needed = lamports + 0.1 * LAMPORTS_PER_SOL;

  console.log("Agent wallet:", agent.publicKey.toBase58());
  console.log("Relayer wallet:", relayerPubkey.toBase58());
  console.log("Deposit amount:", AMOUNT_SOL, "SOL");

  let balance = await connection.getBalance(agent.publicKey);
  console.log("Agent balance before:", balance / LAMPORTS_PER_SOL, "SOL");

  if (balance < needed) {
    console.log("Requesting devnet airdrop...");
    const sig = await connection.requestAirdrop(agent.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
    console.log("Airdrop tx:", sig);
  }

  balance = await connection.getBalance(agent.publicKey);
  console.log("Agent balance after airdrop:", balance / LAMPORTS_PER_SOL, "SOL");

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: agent.publicKey,
      toPubkey: relayerPubkey,
      lamports
    })
  );

  const depositTx = await sendAndConfirmTransaction(connection, tx, [agent], {
    commitment: "confirmed"
  });

  console.log("");
  console.log("Deposit sent.");
  console.log("DARKDROP_DEPOSIT_TX=" + depositTx);
  console.log("");
  console.log("Now run:");
  console.log(`DARKDROP_DEPOSIT_TX="${depositTx}" DARKDROP_AMOUNT_SOL="${AMOUNT_SOL}" npm run darkdropRelayerSmoke`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
