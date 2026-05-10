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
  console.log("DarkDrop Agents Devnet Alpha Demo");
  console.log("");

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/realDarkdropMcp.ts"],
    cwd: process.cwd(),
    env: process.env as Record<string, string>
  });

  const client = new Client({
    name: "dropmate-launch-demo",
    version: "0.1.0"
  });

  await client.connect(transport);

  console.log("1. Checking DarkDrop relayer...");
  const health = parseToolJson(
    await client.callTool({
      name: "check_darkdrop_health",
      arguments: {}
    })
  );

  console.log({
    relayerOnline: health.relayer?.ok,
    relayerPubkey: health.relayer?.relayerPubkey,
    maxDropSol: health.safety?.maxDropSol
  });

  if (!health.relayer?.ok) {
    throw new Error("Relayer is not online. Start /home/darkdropv4/relayer with npm run dev.");
  }

  console.log("");
  console.log("2. Agent A creating real DarkDrop drop...");
  const created = parseToolJson(
    await client.callTool({
      name: "create_darkdrop",
      arguments: {
        creatorId: "agent_a",
        amountSol: 0.005
      }
    })
  );

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
  console.log("3. Agent B claiming drop without printing claim code...");
  const claimed = parseToolJson(
    await client.callTool({
      name: "claim_darkdrop",
      arguments: {
        claimerId: "agent_b",
        claimCode: created.claimCode
      }
    })
  );

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
  console.log("Demo passed.");
  console.log("Claim code was returned once, kept in memory, and not printed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
