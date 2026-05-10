import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  claimDrop,
  createDrop,
  estimateDropFee,
  getRecentDrops
} from "./dropTools.js";

const server = new McpServer({
  name: "dropmate-agent-drops",
  version: "0.1.0"
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
  "estimate_drop_fee",
  {
    amountSol: z.number().positive(),
    solUsdPrice: z.number().positive().optional()
  },
  async (input) => jsonText(estimateDropFee(input))
);

server.tool(
  "create_drop",
  {
    creatorId: z.string().min(1),
    amountSol: z.number().positive(),
    recipientHint: z.string().optional(),
    purpose: z.string().optional(),
    solUsdPrice: z.number().positive().optional()
  },
  async (input) => jsonText(createDrop(input))
);

server.tool(
  "claim_drop",
  {
    claimerId: z.string().min(1),
    claimCode: z.string().min(10)
  },
  async (input) => jsonText(claimDrop(input))
);

server.tool(
  "list_recent_drops",
  {},
  async () => jsonText(getRecentDrops())
);

const transport = new StdioServerTransport();
await server.connect(transport);
