import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { checkDarkdropRelayer } from "./darkdrop/relayer-create.js";
import { createRealDarkdrop, claimRealDarkdrop } from "./darkdropService.js";

const PORT = Number(process.env.DARKDROP_AGENT_PORT || "8790");

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

    if (req.method === "GET" && url.pathname === "/darkdrop/health") {
      sendJson(res, 200, {
        service: "dropmate-agent-real-darkdrop",
        version: "0.2.0",
        relayer: await checkDarkdropRelayer(),
        privacy: {
          claimCodeStorage: "never stored",
          claimCodeLogging: "do not log",
          claimCodeReturn: "returned once from create endpoint"
        }
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/darkdrop/create") {
      const body = await readBody(req);

      const result = await createRealDarkdrop({
        creatorId: body.creatorId || "agent_a",
        amountSol: Number(body.amountSol),
        creatorKeypairPath: body.creatorKeypairPath,
        relayerUrl: body.relayerUrl,
        rpcUrl: body.rpcUrl
      });

      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/darkdrop/claim") {
      const body = await readBody(req);

      const result = await claimRealDarkdrop({
        claimerId: body.claimerId || "agent_b",
        claimCode: body.claimCode,
        recipientAddress: body.recipientAddress,
        claimerKeypairPath: body.claimerKeypairPath,
        relayerUrl: body.relayerUrl
      });

      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, {
      error: "Not found",
      routes: [
        "GET /darkdrop/health",
        "POST /darkdrop/create",
        "POST /darkdrop/claim"
      ]
    });
  } catch (error) {
    sendJson(res, 400, {
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`DropMate Real DarkDrop API running on http://localhost:${PORT}`);
  console.log("Endpoints:");
  console.log("  GET  /darkdrop/health");
  console.log("  POST /darkdrop/create");
  console.log("  POST /darkdrop/claim");
  console.log("");
  console.log("Privacy rule: claim codes are returned once and never stored.");
});
