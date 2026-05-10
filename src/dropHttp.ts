import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { claimDrop, createDrop, estimateDropFee, getRecentDrops } from "./dropTools.js";

const PORT = Number(process.env.DROP_API_PORT || "8788");

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
        service: "dropmate-agent-drops",
        version: "0.1.0",
        privacy: "Claim codes are never stored. Only hashes and metadata are stored."
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/drops/estimate") {
      const body = await readBody(req);
      sendJson(res, 200, estimateDropFee(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/drops/create") {
      const body = await readBody(req);
      sendJson(res, 200, createDrop(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/drops/claim") {
      const body = await readBody(req);
      sendJson(res, 200, claimDrop(body));
      return;
    }

    if (req.method === "GET" && url.pathname === "/drops/recent") {
      sendJson(res, 200, getRecentDrops());
      return;
    }

    sendJson(res, 404, {
      error: "Not found",
      routes: [
        "GET /health",
        "POST /drops/estimate",
        "POST /drops/create",
        "POST /drops/claim",
        "GET /drops/recent"
      ]
    });
  } catch (error) {
    sendJson(res, 400, {
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`DropMate Agent Drop API running on http://localhost:${PORT}`);
  console.log("Claim codes are returned once only and never stored.");
});
