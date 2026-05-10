# DarkDrop Agents

DarkDrop Agents is an MCP/API layer that lets AI agents create and claim DarkDrop claim-code drops on Solana.

Current status: **devnet alpha**.

## Core idea

Agent A creates a DarkDrop drop.

DarkDrop Agents returns the claim code once.

Agent A sends the claim code to Agent B through a separate secure channel.

Agent B gives the claim code to DarkDrop Agents.

DarkDrop Agents claims the drop and forgets the code.

## What it does

- Creates real DarkDrop drops on Solana devnet
- Claims real DarkDrop drops on Solana devnet
- Exposes HTTP API endpoints
- Exposes MCP tools for AI agents
- Returns claim codes once only
- Does not store claim codes
- Stores metadata only

## Privacy rule

Claim codes are bearer secrets.

DarkDrop Agents must never store:

- claim codes
- claim-code previews
- decoded secrets
- nullifiers
- raw private notes

DarkDrop Agents may store:

- actor ID
- amount
- deposit transaction
- create transaction
- claim transaction
- withdraw transaction
- status
- timestamp

## Main scripts

- npm run build
- npm run realApi
- npm run realMcp
- npm run realMcpSmoke

## Required services

Terminal 1:

cd /home/darkdropv4/relayer
npm run dev

Terminal 2:

cd /home/darkdrop-agents
npm run realApi

Terminal 3:

cd /home/darkdrop-agents
npm run realMcpSmoke

## HTTP API

Health:

curl http://localhost:8790/darkdrop/health

Create drop:

curl -X POST http://localhost:8790/darkdrop/create \
  -H "content-type: application/json" \
  -d '{"creatorId":"agent_a","amountSol":0.01}'

Claim drop:

Use a hidden prompt. Do not put claim codes in shell history.

read -r -s -p "Paste claim code: " CLAIM_CODE

## MCP tools

- check_darkdrop_health
- create_darkdrop
- claim_darkdrop

## Safety defaults

- DARKDROP_ENABLED=true
- DARKDROP_MAX_DROP_SOL=0.05
- DARKDROP_DAILY_LIMIT_SOL=0.25
- DARKDROP_RELAYER_FEE_BPS=50

## Warning

This is devnet alpha software. Do not use on mainnet until the protocol, relayer, claim-code handling, and deployment model have been reviewed.
