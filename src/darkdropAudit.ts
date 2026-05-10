import { randomUUID } from "node:crypto";
import { db } from "./db.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS darkdrop_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    amount_sol REAL,
    deposit_tx TEXT,
    created_tx_signature TEXT,
    claim_tx_signature TEXT,
    withdraw_tx_signature TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

export function getCreatedTotalTodaySol() {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);

  const row = db.prepare(`
    SELECT COALESCE(SUM(amount_sol), 0) AS total
    FROM darkdrop_events
    WHERE type = 'create'
      AND status = 'created'
      AND created_at >= ?
  `).get(since.toISOString()) as { total: number };

  return Number(row.total || 0);
}

export function recordDarkdropCreate(input: {
  actorId: string;
  amountSol: number;
  depositTx: string;
  createdTxSignature: string;
}) {
  db.prepare(`
    INSERT INTO darkdrop_events (
      id, type, actor_id, amount_sol, deposit_tx,
      created_tx_signature, claim_tx_signature, withdraw_tx_signature,
      status, created_at
    )
    VALUES (
      @id, 'create', @actorId, @amountSol, @depositTx,
      @createdTxSignature, NULL, NULL,
      'created', @createdAt
    )
  `).run({
    id: randomUUID(),
    actorId: input.actorId,
    amountSol: input.amountSol,
    depositTx: input.depositTx,
    createdTxSignature: input.createdTxSignature,
    createdAt: new Date().toISOString()
  });
}

export function recordDarkdropClaim(input: {
  actorId: string;
  amountSol: number;
  claimTxSignature: string;
  withdrawTxSignature: string;
}) {
  db.prepare(`
    INSERT INTO darkdrop_events (
      id, type, actor_id, amount_sol, deposit_tx,
      created_tx_signature, claim_tx_signature, withdraw_tx_signature,
      status, created_at
    )
    VALUES (
      @id, 'claim', @actorId, @amountSol, NULL,
      NULL, @claimTxSignature, @withdrawTxSignature,
      'claimed', @createdAt
    )
  `).run({
    id: randomUUID(),
    actorId: input.actorId,
    amountSol: input.amountSol,
    claimTxSignature: input.claimTxSignature,
    withdrawTxSignature: input.withdrawTxSignature,
    createdAt: new Date().toISOString()
  });
}

export function listDarkdropEvents(limit = 50) {
  return db.prepare(`
    SELECT *
    FROM darkdrop_events
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);
}
