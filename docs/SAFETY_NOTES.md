# Safety Notes

## Safe in current devnet alpha

DarkDrop Agents can create and claim real DarkDrop drops on Solana devnet.

It supports:

- real DarkDrop create flow
- real DarkDrop claim flow
- MCP tools
- HTTP API
- metadata-only audit logging
- basic safety limits
- duplicate-claim failure test

## Not production-ready yet

Do not use this on mainnet yet.

Still needed before production:

- independent security review
- stricter key management
- better deployment isolation
- stronger API authentication
- persistent rate limiting
- monitoring and alerting
- documented incident process
- review of DarkDrop mainnet readiness
- legal/compliance wording

## Claim-code rule

Claim codes are bearer secrets.

Whoever has the claim code can claim the drop.

DarkDrop Agents must never store claim codes.
