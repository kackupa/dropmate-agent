import { encodeClaimCode, decodeClaimCode } from "./claim-code.js";
import { initPoseidon } from "./crypto.js";
import { getVaultPDA, prepareCreateDrop } from "./vault.js";

export async function generateDarkDropClaimCode(input: {
  amountSol: number;
  cluster?: "devnet" | "mainnet" | "localnet";
  password?: string;
}) {
  if (!Number.isFinite(input.amountSol) || input.amountSol <= 0) {
    throw new Error("amountSol must be greater than 0.");
  }

  await initPoseidon();

  const lamports = BigInt(Math.round(input.amountSol * 1e9));
  const prepared = prepareCreateDrop(lamports);
  const [vault] = getVaultPDA();

  /**
   * This is a real DarkDrop claim-code payload shape, but not yet a real
   * on-chain drop because we have not submitted create_drop or read the
   * post-insert leaf index/snapshot from chain.
   *
   * Next step will replace leafIndex=0 with the real index after relayer tx.
   */
  const claimCode = await encodeClaimCode(
    {
      ...prepared.claimPayload,
      leafIndex: 0,
      vaultAddress: vault.toBase58(),
      flavor: "standard"
    },
    input.cluster || "devnet",
    "sol",
    input.password
  );

  return {
    claimCode,
    warning: "Returned once only. Do not store plaintext claim codes.",
    darkdropPayload: {
      leaf: Array.from(prepared.leaf),
      amountLamports: lamports.toString(),
      commitment: Array.from(prepared.amountCommitment),
      seed: Array.from(prepared.passwordHash),
      vaultAddress: vault.toBase58()
    }
  };
}

export async function inspectDarkDropClaimCodeForDevOnly(code: string, password?: string) {
  const decoded = await decodeClaimCode(code, password);

  return {
    version: decoded.version,
    cluster: decoded.cluster,
    asset: decoded.asset,
    encryption: decoded.encryption,
    amountLamports: decoded.payload.amount.toString(),
    leafIndex: decoded.payload.leafIndex,
    vaultAddress: decoded.payload.vaultAddress,
    flavor: decoded.payload.flavor,
    note: "Dev inspection only. Do not log decoded secrets in production."
  };
}
