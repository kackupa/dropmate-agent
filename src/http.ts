import { createServer, IncomingMessage, ServerResponse } from "node:http";
import {
  approvePayment,
  estimatePrivatePaymentFee,
  listPendingPayments,
  prepareClaimCodePayment,
  rejectPayment,
  saveReceipt
} from "./tools.js";

const PORT = Number(process.env.PORT || "8787");

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.writeHead(statusCode, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  });

  res.end(JSON.stringify(data, null, 2));
}

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });

    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      sendJson(res, 200, { ok: true });
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        service: "dropmate-agent",
        version: "0.1.0"
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/pending") {
      sendJson(res, 200, {
        pending: listPendingPayments()
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/estimate") {
      const body = await readBody(req);
      sendJson(res, 200, estimatePrivatePaymentFee(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/prepare") {
      const body = await readBody(req);
      sendJson(res, 200, prepareClaimCodePayment(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/approve") {
      const body = await readBody(req);
      sendJson(res, 200, approvePayment(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/reject") {
      const body = await readBody(req);
      sendJson(res, 200, rejectPayment(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/receipt") {
      const body = await readBody(req);
      sendJson(res, 200, saveReceipt(body));
      return;
    }

    sendJson(res, 404, {
      error: "Not found",
      routes: [
        "GET /health",
        "GET /pending",
        "POST /estimate",
        "POST /prepare",
        "POST /approve",
        "POST /reject",
        "POST /receipt"
      ]
    });
  } catch (error) {
    sendJson(res, 400, {
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`DropMate Agent HTTP API running on http://localhost:${PORT}`);
});
