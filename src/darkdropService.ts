import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
import { claimDarkdropViaRelayer } from "./darkdrop/relayer-claim.js";
import { config } from "./config.js";
import {
  getCreatedTotalTodaySol,
  recordDarkdropClaim,
  recordDarkdropCreate
} from "./darkdropAudit.js";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const RELAYER_URL = process.env.DARKDROP_RELAYER_URL || "http://localhost:3001";
const DEFAULT_CREATOR_KEYPAIR_PATH =
  process.env.AGENT_KEYPAIR_PATH || "./data/agent-a-devnet.json";
const DEFAULT_CLAIMER_KEYPAIR_PATH =
  process.env.AGENT_B_KEYPAIR_PATH || "./data/agent-b-devnet.json";

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

async function getRelayerPubkey(relayerUrl = RELAYER_URL) {
  const health = await fetch(`${relayerUrl}/health`).then((r) => r.json());

  if (!health?.relayerPubkey) {
    throw new Error("Relayer health check did not return relayerPubkey.");
  }

  return new PublicKey(health.relayerPubkey);
}

export async function createRealDarkdrop(input: {
  creatorId: string;
  amountSol: number;
  creatorKeypairPath?: string;
  relayerUrl?: string;
  rpcUrl?: string;
}) {
  if (!input.creatorId) {
    throw new Error("creatorId is required.");
  }

  if (!config.darkdropEnabled) {
    throw new Error("DarkDrop actions are disabled by DARKDROP_ENABLED=false.");
  }

  if (!Number.isFinite(input.amountSol) || input.amountSol <= 0) {
    throw new Error("amountSol must be greater than 0.");
  }

  if (input.amountSol > config.darkdropMaxDropSol) {
    throw new Error(
      `Drop blocked: amount ${input.amountSol} SOL exceeds max drop size ${config.darkdropMaxDropSol} SOL.`
    );
  }

  const createdToday = getCreatedTotalTodaySol();
  if (createdToday + input.amountSol > config.darkdropDailyLimitSol) {
    throw new Error(
      `Drop blocked: daily create limit would be exceeded. Used ${createdToday} SOL of ${config.darkdropDailyLimitSol} SOL.`
    );
  }

  const rpcUrl = input.rpcUrl || RPC_URL;
  const relayerUrl = input.relayerUrl || RELAYER_URL;
  const connection = new Connection(rpcUrl, "confirmed");

  const creator = loadOrCreateKeypair(
    input.creatorKeypairPath || DEFAULT_CREATOR_KEYPAIR_PATH
  );

  const relayerPubkey = await getRelayerPubkey(relayerUrl);
  const lamports = Math.round(input.amountSol * LAMPORTS_PER_SOL);

  const balance = await connection.getBalance(creator.publicKey);
  if (balance < lamports + 0.01 * LAMPORTS_PER_SOL) {
    throw new Error(
      `Creator wallet needs more devnet SOL. Wallet: ${creator.publicKey.toBase58()}`
    );
  }

  const depositTxObj = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: creator.publicKey,
      toPubkey: relayerPubkey,
      lamports
    })
  );

  const depositTx = await sendAndConfirmTransaction(connection, depositTxObj, [creator], {
    commitment: "confirmed"
  });

  const created = await createDarkdropViaRelayer({
    creatorId: input.creatorId,
    amountSol: input.amountSol,
    depositTx,
    relayerUrl,
    rpcUrl,
    cluster: "devnet"
  });

  recordDarkdropCreate({
    actorId: input.creatorId,
    amountSol: input.amountSol,
    depositTx,
    createdTxSignature: created.drop.createdTxSignature
  });

  return {
    creatorId: input.creatorId,
    creatorWallet: creator.publicKey.toBase58(),
    relayerWallet: relayerPubkey.toBase58(),
    depositTx,
    drop: created.drop,
    claimCode: created.claimCode,
    warning: "Claim code is returned once only. DropMate does not store plaintext claim codes.",
    nextStep: "Send the claim code to the recipient through a separate secure channel."
  };
}

export async function claimRealDarkdrop(input: {
  claimerId: string;
  claimCode: string;
  recipientAddress?: string;
  claimerKeypairPath?: string;
  relayerUrl?: string;
}) {
  if (!input.claimerId) {
    throw new Error("claimerId is required.");
  }

  if (!input.claimCode?.startsWith("darkdrop:v4:")) {
    throw new Error("Valid DarkDrop claimCode is required.");
  }

  let recipientAddress = input.recipientAddress;

  if (!recipientAddress) {
    const claimer = loadOrCreateKeypair(
      input.claimerKeypairPath || DEFAULT_CLAIMER_KEYPAIR_PATH
    );
    recipientAddress = claimer.publicKey.toBase58();
  }

  const result = await claimDarkdropViaRelayer({
    claimerId: input.claimerId,
    claimCode: input.claimCode,
    recipientAddress,
    relayerUrl: input.relayerUrl || RELAYER_URL
  });

  recordDarkdropClaim({
    actorId: input.claimerId,
    amountSol: Number(result.amountLamports) / LAMPORTS_PER_SOL,
    claimTxSignature: result.claimTxSignature,
    withdrawTxSignature: result.withdrawTxSignature
  });

  return {
    ...result,
    warning: "Claim code was used in memory only and must not be logged or stored."
  };
}
