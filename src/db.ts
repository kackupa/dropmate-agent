import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.js";

mkdirSync(dirname(config.databasePath), { recursive: true });

export const db = new Database(config.databasePath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS payment_drafts (
    id TEXT PRIMARY KEY,
    amount_sol REAL NOT NULL,
    recipient TEXT,
    purpose TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    status TEXT NOT NULL,
    fee_usd REAL NOT NULL,
    policy_notes TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    draft_id TEXT,
    tx_signature TEXT,
    claim_code_preview TEXT,
    notes TEXT,
    created_at TEXT NOT NULL
  );
`);

export type PaymentDraft = {
  id: string;
  amount_sol: number;
  recipient: string | null;
  purpose: string;
  requested_by: string;
  status: "pending_approval" | "approved" | "rejected" | "blocked" | "executed";
  fee_usd: number;
  policy_notes: string;
  created_at: string;
  updated_at: string;
};

export function insertDraft(draft: PaymentDraft) {
  db.prepare(`
    INSERT INTO payment_drafts (
      id, amount_sol, recipient, purpose, requested_by, status,
      fee_usd, policy_notes, created_at, updated_at
    )
    VALUES (
      @id, @amount_sol, @recipient, @purpose, @requested_by, @status,
      @fee_usd, @policy_notes, @created_at, @updated_at
    )
  `).run(draft);
}

export function listDrafts(status?: string) {
  if (status) {
    return db.prepare(`
      SELECT * FROM payment_drafts
      WHERE status = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(status) as PaymentDraft[];
  }

  return db.prepare(`
    SELECT * FROM payment_drafts
    ORDER BY created_at DESC
    LIMIT 50
  `).all() as PaymentDraft[];
}

export function getDraft(id: string) {
  return db.prepare(`
    SELECT * FROM payment_drafts
    WHERE id = ?
  `).get(id) as PaymentDraft | undefined;
}

export function updateDraftStatus(id: string, status: PaymentDraft["status"]) {
  db.prepare(`
    UPDATE payment_drafts
    SET status = ?, updated_at = ?
    WHERE id = ?
  `).run(status, new Date().toISOString(), id);
}

export function insertReceipt(input: {
  id: string;
  draft_id?: string;
  tx_signature?: string;
  claim_code_preview?: string;
  notes?: string;
}) {
  db.prepare(`
    INSERT INTO receipts (
      id, draft_id, tx_signature, claim_code_preview, notes, created_at
    )
    VALUES (
      @id, @draft_id, @tx_signature, @claim_code_preview, @notes, @created_at
    )
  `).run({
    id: input.id,
    draft_id: input.draft_id || null,
    tx_signature: input.tx_signature || null,
    claim_code_preview: input.claim_code_preview || null,
    notes: input.notes || null,
    created_at: new Date().toISOString()
  });
}
