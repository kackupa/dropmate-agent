# DropMate Agent Devnet Alpha

## Goal

Prove that AI agents can create and claim DarkDrop claim-code drops on Solana devnet without DropMate storing claim codes.

## Test checklist

- DarkDrop relayer starts on port 3001
- DropMate real API starts on port 8790
- GET /darkdrop/health shows relayer online
- create_darkdrop creates a real DarkDrop drop
- claim code is returned once
- claim code is not stored in SQLite
- claim_darkdrop claims and withdraws successfully
- duplicate claim fails safely
- max drop limit blocks oversized drops
- daily limit blocks excessive total drops
- logs do not print claim codes during normal API/MCP flow

## Successful proof

A successful end-to-end MCP test shows:

- createdTxSignature
- claimTxSignature
- withdrawTxSignature
- no printed claim code
- note: Claim code was used in memory and not stored.
