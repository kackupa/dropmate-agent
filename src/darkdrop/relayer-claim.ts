import { PublicKey } from "@solana/web3.js";
import { decodeClaimCode } from "./claim-code.js";
import {
  amountCommitment as computeAmountCommitment,
  bigintToBytes32BE,
  bytes32BEToBigint,
  initPoseidon,
  nullifierHash as computeNullifierHash,
  passwordHash as computePasswordHash
} from "./crypto.js";
import { buildProofFromSnapshot, decodeTreeSnapshot } from "./merkle.js";
import { generateClaimProofV2, setV2ArtifactPaths } from "./proof.js";

const DEFAULT_RELAYER_URL = process.env.DARKDROP_RELAYER_URL || "http://localhost:3001";
const RELAYER_FEE_BPS = Number(process.env.DARKDROP_RELAYER_FEE_BPS || "50");

function passwordToBigint(password?: string) {
  if (!password) return 0n;

  return BigInt(
    "0x" +
      Array.from(new TextEncoder().encode(password))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
  );
}

function randomSaltBytes() {
  const BN254_FR = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const reduced = bytes32BEToBigint(raw) % BN254_FR;
  return bigintToBytes32BE(reduced);
}

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

export async function claimDarkdropViaRelayer(input: {
  claimerId: string;
  claimCode: string;
  recipientAddress: string;
  password?: string;
  relayerUrl?: string;
}) {
  if (!input.claimerId) throw new Error("claimerId is required.");
  if (!input.claimCode?.startsWith("darkdrop:v4:")) {
    throw new Error("Invalid DarkDrop V4 claim code.");
  }

  await initPoseidon();

  setV2ArtifactPaths(
    "./circuits/darkdrop.wasm",
    "./circuits/darkdrop_v2_final.zkey"
  );

  const decoded = await decodeClaimCode(input.claimCode, input.password);
  const payload = decoded.payload;

  if (payload.flavor === "pool") {
    throw new Error("Pool-flavored claim codes are not supported by DarkDrop Agents yet.");
  }

  if (!payload.pathSnapshot) {
    throw new Error("Claim code has no embedded path snapshot. Legacy scan fallback not implemented yet.");
  }

  const recipient = new PublicKey(input.recipientAddress);

  const nullHash = computeNullifierHash(payload.nullifier);
  const amountCommitment = computeAmountCommitment(payload.amount, payload.blindingFactor);
  const passwordBigint = passwordToBigint(input.password);
  const pwdHash = computePasswordHash(passwordBigint);

  const snap = decodeTreeSnapshot(payload.pathSnapshot);
  const proof = buildProofFromSnapshot(snap, payload.leafIndex);

  const proofResult = await generateClaimProofV2(
    {
      secret: payload.secret,
      nullifier: payload.nullifier,
      amount: payload.amount,
      blindingFactor: payload.blindingFactor,
      password: passwordBigint
    },
    proof,
    recipient,
    nullHash,
    amountCommitment,
    pwdHash
  );

  const nullifierHashBytes = bigintToBytes32BE(nullHash);

  const opaqueInputs = new Uint8Array(96);
  opaqueInputs.set(proofResult.merkleRoot, 0);
  opaqueInputs.set(proofResult.amountCommitment, 32);
  opaqueInputs.set(proofResult.passwordHash, 64);

  const saltBytes = randomSaltBytes();

  const claimResult = await postJson(`${input.relayerUrl || DEFAULT_RELAYER_URL}/api/relay/credit/claim`, {
    proof: {
      proofA: Array.from(proofResult.proofA),
      proofB: Array.from(proofResult.proofB),
      proofC: Array.from(proofResult.proofC)
    },
    nullifierHash: Array.from(nullifierHashBytes),
    recipient: recipient.toBase58(),
    inputs: Array.from(opaqueInputs),
    salt: Array.from(saltBytes)
  });

  const openingBuf = new Uint8Array(72);
  new DataView(openingBuf.buffer).setBigUint64(0, payload.amount, true);
  openingBuf.set(bigintToBytes32BE(payload.blindingFactor), 8);
  openingBuf.set(saltBytes, 40);

  const withdrawResult = await postJson(`${input.relayerUrl || DEFAULT_RELAYER_URL}/api/relay/credit/withdraw`, {
    nullifierHash: Array.from(nullifierHashBytes),
    opening: Array.from(openingBuf),
    recipient: recipient.toBase58()
  });

  const fee = (payload.amount * BigInt(RELAYER_FEE_BPS)) / 10000n;
  const net = payload.amount - fee;

  return {
    claimerId: input.claimerId,
    recipient: recipient.toBase58(),
    amountLamports: payload.amount.toString(),
    netLamports: net.toString(),
    feeLamports: fee.toString(),
    claimTxSignature: claimResult.signature,
    withdrawTxSignature: withdrawResult.signature,
    note: "Claim code was used in memory and not stored."
  };
}
