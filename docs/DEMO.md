# DarkDrop Agents Demo

## Start services

Terminal 1:

```bash
cd /home/darkdropv4/relayer
npm run dev
```

Terminal 2:

```bash
cd /home/darkdrop-agents
npm run realApi
```

## Run MCP demo

Terminal 3:

```bash
cd /home/darkdrop-agents
npm run launchDemo
```

## Run duplicate-claim test

```bash
cd /home/darkdrop-agents
npm run duplicateClaimSmoke
```

## Run privacy audit

```bash
cd /home/darkdrop-agents
npm run privacyAudit
```

## Expected result

The demo should create and claim a real DarkDrop devnet drop.

It should print:

- deposit transaction
- create transaction
- claim transaction
- withdraw transaction

It should not print the full claim code.
