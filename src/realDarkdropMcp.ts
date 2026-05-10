import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { checkDarkdropRelayer } from "./darkdrop/relayer-create.js";
import { claimRealDarkdrop, createRealDarkdrop } from "./darkdropService.js";

const server = new McpServer({
  name: "dropmate-real-darkdrop",
  version: "0.2.0"
});

function jsonText(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

server.tool(
  "check_darkdrop_health",
  {},
  async () => {
    const relayer = await checkDarkdropRelayer();

    return jsonText({
      service: "dropmate-real-darkdrop",
      version: "0.2.0",
      relayer,
      privacy: {
        claimCodeStorage: "never stored",
        claimCodeReturn: "returned once from create_darkdrop",
        claimCodeClaim: "used in memory only during claim_darkdrop"
      }
    });
  }
);

server.tool(
  "create_darkdrop",
  {
    creatorId: z.string().min(1).default("agent_a"),
    amountSol: z.number().positive(),
    creatorKeypairPath: z.string().optional(),
    relayerUrl: z.string().optional(),
    rpcUrl: z.string().optional()
  },
  async (input) => {
    const result = await createRealDarkdrop({
      creatorId: input.creatorId,
      amountSol: input.amountSol,
      creatorKeypairPath: input.creatorKeypairPath,
      relayerUrl: input.relayerUrl,
      rpcUrl: input.rpcUrl
    });

    return jsonText({
      ...result,
      securityNotice:
        "The claimCode is returned once in this response. Send it through a separate secure channel. DropMate does not store it."
    });
  }
);

server.tool(
  "claim_darkdrop",
  {
    claimerId: z.string().min(1).default("agent_b"),
    claimCode: z.string().min(10),
    recipientAddress: z.string().optional(),
    claimerKeypairPath: z.string().optional(),
    relayerUrl: z.string().optional()
  },
  async (input) => {
    const result = await claimRealDarkdrop({
      claimerId: input.claimerId,
      claimCode: input.claimCode,
      recipientAddress: input.recipientAddress,
      claimerKeypairPath: input.claimerKeypairPath,
      relayerUrl: input.relayerUrl
    });

    return jsonText({
      ...result,
      securityNotice:
        "The claimCode was used in memory only. DropMate did not store it."
    });
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
