import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

function parseToolJson(result: any) {
  const text = result?.content?.find((item: any) => item.type === "text")?.text;

  if (!text) {
    throw new Error("Tool returned no text content.");
  }

  return JSON.parse(text);
}

async function main() {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/realDarkdropMcp.ts"],
    cwd: process.cwd(),
    env: process.env as Record<string, string>
  });

  const client = new Client({
    name: "dropmate-real-mcp-smoke",
    version: "0.1.0"
  });

  await client.connect(transport);

  console.log("Checking MCP DarkDrop health...");
  const healthResult = await client.callTool({
    name: "check_darkdrop_health",
    arguments: {}
  });

  const health = parseToolJson(healthResult);
  console.log({
    service: health.service,
    relayerOnline: health.relayer?.ok,
    relayerPubkey: health.relayer?.relayerPubkey
  });

  if (!health.relayer?.ok) {
    throw new Error("DarkDrop relayer is not online.");
  }

  console.log("");
  console.log("Creating real DarkDrop drop through MCP...");

  const createResult = await client.callTool({
    name: "create_darkdrop",
    arguments: {
      creatorId: "agent_a",
      amountSol: 0.01
    }
  });

  const created = parseToolJson(createResult);

  console.log({
    creatorWallet: created.creatorWallet,
    depositTx: created.depositTx,
    createdTxSignature: created.drop?.createdTxSignature,
    leafIndex: created.drop?.leafIndex,
    claimCodeReturnedOnce: Boolean(created.claimCode)
  });

  if (!created.claimCode) {
    throw new Error("create_darkdrop did not return a claim code.");
  }

  console.log("");
  console.log("Claiming real DarkDrop drop through MCP without printing claim code...");

  const claimResult = await client.callTool({
    name: "claim_darkdrop",
    arguments: {
      claimerId: "agent_b",
      claimCode: created.claimCode
    }
  });

  const claimed = parseToolJson(claimResult);

  console.log({
    recipient: claimed.recipient,
    amountLamports: claimed.amountLamports,
    netLamports: claimed.netLamports,
    feeLamports: claimed.feeLamports,
    claimTxSignature: claimed.claimTxSignature,
    withdrawTxSignature: claimed.withdrawTxSignature,
    note: claimed.note
  });

  await client.close();

  console.log("");
  console.log("MCP real DarkDrop flow passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
