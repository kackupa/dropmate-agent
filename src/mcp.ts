import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  approvePayment,
  estimatePrivatePaymentFee,
  listPendingPayments,
  prepareClaimCodePayment,
  rejectPayment,
  saveReceipt
} from "./tools.js";

const server = new McpServer({
  name: "dropmate-agent",
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
  "estimate_private_payment_fee",
  {
    amountSol: z.number().positive(),
    solUsdPrice: z.number().positive().optional()
  },
  async (input) => jsonText(estimatePrivatePaymentFee(input))
);

server.tool(
  "prepare_claim_code_payment",
  {
    amountSol: z.number().positive(),
    recipient: z.string().optional(),
    purpose: z.string().min(3),
    requestedBy: z.string().optional(),
    solUsdPrice: z.number().positive().optional()
  },
  async (input) => jsonText(prepareClaimCodePayment(input))
);

server.tool(
  "list_pending_payments",
  {},
  async () => jsonText(listPendingPayments())
);

server.tool(
  "approve_payment",
  {
    draftId: z.string().uuid()
  },
  async (input) => jsonText(approvePayment(input))
);

server.tool(
  "reject_payment",
  {
    draftId: z.string().uuid(),
    reason: z.string().optional()
  },
  async (input) => jsonText(rejectPayment(input))
);

server.tool(
  "save_receipt",
  {
    draftId: z.string().uuid().optional(),
    txSignature: z.string().optional(),
    claimCodePreview: z.string().optional(),
    notes: z.string().optional()
  },
  async (input) => jsonText(saveReceipt(input))
);

const transport = new StdioServerTransport();
await server.connect(transport);
