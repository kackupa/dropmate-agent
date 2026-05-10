import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { checkDarkdropRelayer } from "./darkdrop/relayer-create.js";
import { createRealDarkdrop, claimRealDarkdrop } from "./darkdropService.js";
import { listDarkdropEvents } from "./darkdropAudit.js";
import { config } from "./config.js";

const PORT = Number(process.env.DARKDROP_AGENT_PORT || "8790");
const API_KEY = process.env.DROPMATE_API_KEY || "";
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || "60000");
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || "20");

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.writeHead(statusCode, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,x-api-key,authorization"
  });

  res.end(JSON.stringify(data, null, 2));
}

function getClientKey(req: IncomingMessage, pathname: string) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded || req.socket.remoteAddress || "unknown";

  return `${ip}:${pathname}`;
}

function checkRateLimit(req: IncomingMessage, pathname: string) {
  const now = Date.now();
  const key = getClientKey(req, pathname);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    });

    return;
  }

  bucket.count += 1;

  if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
    throw new Error("Rate limit exceeded. Try again later.");
  }
}

function requireApiKey(req: IncomingMessage) {
  if (!API_KEY) return;

  const headerKey = req.headers["x-api-key"];
  const auth = req.headers.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";

  const supplied = Array.isArray(headerKey) ? headerKey[0] : headerKey || bearer;

  if (supplied !== API_KEY) {
    throw new Error("Unauthorized: missing or invalid API key.");
  }
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
        version: "0.3.0",
        relayer: await checkDarkdropRelayer(),
        safety: {
          enabled: config.darkdropEnabled,
          maxDropSol: config.darkdropMaxDropSol,
          dailyLimitSol: config.darkdropDailyLimitSol,
          apiKeyRequired: Boolean(API_KEY),
          rateLimitMaxRequests: RATE_LIMIT_MAX_REQUESTS,
          rateLimitWindowMs: RATE_LIMIT_WINDOW_MS
        },
        privacy: {
          claimCodeStorage: "never stored",
          claimCodeLogging: "do not log",
          claimCodeReturn: "returned once from create endpoint"
        }
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/darkdrop/events") {
      requireApiKey(req);
      checkRateLimit(req, url.pathname);

      sendJson(res, 200, {
        events: listDarkdropEvents(50)
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/darkdrop/create") {
      requireApiKey(req);
      checkRateLimit(req, url.pathname);

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
      requireApiKey(req);
      checkRateLimit(req, url.pathname);

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
        "GET /darkdrop/events",
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
  console.log("  GET  /darkdrop/events");
  console.log("  POST /darkdrop/create");
  console.log("  POST /darkdrop/claim");
  console.log("");
  console.log("Privacy rule: claim codes are returned once and never stored.");
  console.log(`API key required: ${Boolean(API_KEY)}`);
});
