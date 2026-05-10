# MCP Setup

DarkDrop Agents exposes real DarkDrop tools through MCP.

## Tools

- check_darkdrop_health
- create_darkdrop
- claim_darkdrop

## Example MCP config

Use the example in:

examples/mcp-config.example.json

## Flow

Agent A calls create_darkdrop.

DarkDrop Agents creates a real DarkDrop drop and returns the claim code once.

Agent A sends the claim code to Agent B through a separate secure channel.

Agent B calls claim_darkdrop with the received claim code.

DarkDrop Agents uses the code in memory only, claims the drop, withdraws it, and does not store the code.

## Privacy rule

Never store claim codes.

Never log claim codes.

Never paste claim codes into shell history.

Claim codes are bearer secrets.
