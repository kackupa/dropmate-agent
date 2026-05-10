import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const bannedPatterns = [
  "claim_code_preview",
  "claimCodePreview",
  "claim-code preview",
  "list_received_codes",
  "send_claim_code",
  "FULL CLAIM CODE",
  "console.log(created.claimCode",
  "console.log(claimCode"
];

const roots = ["src"];
const findings: string[] = [];

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      walk(full);
      continue;
    }

    if (!full.endsWith(".ts")) continue;
    if (full.endsWith("privacyAudit.ts")) continue;

    const text = readFileSync(full, "utf8");

    for (const pattern of bannedPatterns) {
      if (text.includes(pattern)) {
        findings.push(`${full}: contains banned pattern "${pattern}"`);
      }
    }
  }
}

for (const root of roots) {
  walk(root);
}

if (findings.length > 0) {
  console.error("Privacy audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("Privacy audit passed: no banned claim-code storage/logging patterns found.");
