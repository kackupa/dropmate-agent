import { randomBytes, createHash, randomUUID } from "node:crypto";
import { db } from "./db.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS drops (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    recipient_hint TEXT,
    amount_sol REAL NOT NULL,
    purpose TEXT,
    status TEXT NOT NULL,
    claim_code_hash TEXT NOT NULL,
    created_tx_signature TEXT,
    claimed_tx_signature TEXT,
    created_at TEXT NOT NULL,
    claimed_at TEXT
  );
`);

export type Drop = {
  id: string;
  creator_id: string;
  recipient_hint: string | null;
  amount_sol: number;
  purpose: string | null;
  status: "created" | "claimed";
  claim_code_hash: string;
  created_tx_signature: string | null;
  claimed_tx_signature: string | null;
  created_at: string;
  claimed_at: string | null;
};

export function makeClaimCode() {
  return `dm_dev_${randomBytes(32).toString("base64url")}`;
}

export function hashClaimCode(claimCode: string) {
  return createHash("sha256").update(claimCode.trim()).digest("hex");
}

export function fakeTxSignature(prefix: string) {
  return `${prefix}_${randomBytes(24).toString("base64url")}`;
}

export function insertDrop(input: {
  creatorId: string;
  recipientHint?: string;
  amountSol: number;
  purpose?: string;
  claimCodeHash: string;
}) {
  const now = new Date().toISOString();

  const drop: Drop = {
    id: randomUUID(),
    creator_id: input.creatorId,
    recipient_hint: input.recipientHint || null,
    amount_sol: input.amountSol,
    purpose: input.purpose || null,
    status: "created",
    claim_code_hash: input.claimCodeHash,
    created_tx_signature: fakeTxSignature("create"),
    claimed_tx_signature: null,
    created_at: now,
    claimed_at: null
  };

  db.prepare(`
    INSERT INTO drops (
      id, creator_id, recipient_hint, amount_sol, purpose, status,
      claim_code_hash, created_tx_signature, claimed_tx_signature,
      created_at, claimed_at
    )
    VALUES (
      @id, @creator_id, @recipient_hint, @amount_sol, @purpose, @status,
      @claim_code_hash, @created_tx_signature, @claimed_tx_signature,
      @created_at, @claimed_at
    )
  `).run(drop);

  return drop;
}

export function findDropByClaimCode(claimCode: string) {
  const hash = hashClaimCode(claimCode);

  return db.prepare(`
    SELECT * FROM drops
    WHERE claim_code_hash = ?
    LIMIT 1
  `).get(hash) as Drop | undefined;
}

export function markDropClaimed(dropId: string) {
  const tx = fakeTxSignature("claim");
  const claimedAt = new Date().toISOString();

  db.prepare(`
    UPDATE drops
    SET status = 'claimed',
        claimed_tx_signature = ?,
        claimed_at = ?
    WHERE id = ?
  `).run(tx, claimedAt, dropId);

  return {
    claimedTxSignature: tx,
    claimedAt
  };
}

export function listRecentDrops(limit = 25) {
  return db.prepare(`
    SELECT
      id,
      creator_id,
      recipient_hint,
      amount_sol,
      purpose,
      status,
      created_tx_signature,
      claimed_tx_signature,
      created_at,
      claimed_at
    FROM drops
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);
}
