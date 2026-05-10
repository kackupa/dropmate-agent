import { Connection } from "@solana/web3.js";
import { encodeClaimCode } from "./claim-code.js";
import { initPoseidon } from "./crypto.js";
import { getMerkleTreePDA, getVaultPDA, prepareCreateDrop } from "./vault.js";
import { readTreeNextIndex, snapshotTreeAccount } from "./merkle.js";

export type RelayCreateInput = {
  creatorId: string;
  amountSol: number;
  depositTx: string;
  relayerUrl?: string;
  rpcUrl?: string;
  cluster?: "devnet" | "mainnet" | "localnet";
  password?: string;
};

const DEFAULT_RELAYER_URL = process.env.DARKDROP_RELAYER_URL || "http://localhost:3001";
const DEFAULT_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  return data;
}

export async function createDarkdropViaRelayer(input: RelayCreateInput) {
  if (!input.creatorId || input.creatorId.trim().length < 1) {
    throw new Error("creatorId is required.");
  }

  if (!Number.isFinite(input.amountSol) || input.amountSol <= 0) {
    throw new Error("amountSol must be greater than 0.");
  }

  if (!input.depositTx || input.depositTx.trim().length < 20) {
    throw new Error("depositTx is required. The agent must first send SOL to the relayer.");
  }

  await initPoseidon();

  const relayerUrl = input.relayerUrl || DEFAULT_RELAYER_URL;
  const rpcUrl = input.rpcUrl || DEFAULT_RPC_URL;
  const connection = new Connection(rpcUrl, "confirmed");

  const lamports = BigInt(Math.round(input.amountSol * 1e9));
  const prepared = prepareCreateDrop(lamports);
  const [vault] = getVaultPDA();
  const [merkleTree] = getMerkleTreePDA(vault);

  const result = await postJson(`${relayerUrl}/api/relay/create-drop`, {
    leaf: Array.from(prepared.leaf),
    amount: lamports.toString(),
    commitment: Array.from(prepared.amountCommitment),
    seed: Array.from(prepared.passwordHash),
    depositTx: input.depositTx
  });

  const treeAccount = await connection.getAccountInfo(merkleTree);
  if (!treeAccount) {
    throw new Error("Failed to read DarkDrop Merkle tree account after create_drop.");
  }

  const nextIndex = readTreeNextIndex(treeAccount.data);
  const leafIndex = nextIndex - 1;
  const pathSnapshot = snapshotTreeAccount(treeAccount.data);

  const claimCode = await encodeClaimCode(
    {
      ...prepared.claimPayload,
      leafIndex,
      vaultAddress: vault.toBase58(),
      pathSnapshot,
      flavor: "standard"
    },
    input.cluster || "devnet",
    "sol",
    input.password
  );

  return {
    drop: {
      creatorId: input.creatorId,
      amountSol: input.amountSol,
      amountLamports: lamports.toString(),
      status: "created",
      createdTxSignature: result.signature,
      depositTx: input.depositTx,
      leafIndex,
      vaultAddress: vault.toBase58()
    },
    claimCode,
    warning: "Claim code is returned once only. DarkDrop Agents does not store plaintext claim codes.",
    nextStep: "Send the claim code to the recipient through a separate secure channel."
  };
}

export async function checkDarkdropRelayer(input?: { relayerUrl?: string }) {
  const relayerUrl = input?.relayerUrl || DEFAULT_RELAYER_URL;

  try {
    const res = await fetch(`${relayerUrl}/health`);
    const data = await res.json().catch(() => ({}));

    return {
      ok: res.ok,
      relayerUrl,
      ...data
    };
  } catch (error) {
    return {
      ok: false,
      relayerUrl,
      error: error instanceof Error ? error.message : "Relayer unavailable"
    };
  }
}
