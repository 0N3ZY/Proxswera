import { execFileSync } from "node:child_process";
import fs from "node:fs";

const changed = execFileSync("git", ["diff", "--name-only", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
if (!changed.length) throw new Error("AI patch did not change any tracked files.");

const prohibited = /(^|\/)\.github\/workflows\/|(^|\/)(\.env[^/]*|secrets?(\.[^/]*)?|credentials?(\.[^/]*)?|id_rsa|id_ed25519|.*\.(pem|p12|pfx))$/i;
const protectedArea = /(^|\/)(auth|authentication|authorization|crypto|cryptography|encryption|tls|ssl|certificates?|security|secrets?|wisp|proxy|transport|network|sandbox|permissions?|sessions?|tokens?)(\/|\.|$)/i;
for (const file of changed) {
  if (prohibited.test(file) || /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|npm-shrinkwrap\.json|Cargo\.lock)$/.test(file)) {
    throw new Error(`Protected infrastructure/secret/lockfile path changed: ${file}`);
  }
  if (!fs.existsSync(file)) throw new Error(`Unexpected deleted or missing file: ${file}`);
}

const diff = execFileSync("git", ["diff", "--unified=0", "--"], { encoding: "utf8" });
const additions = diff.split("\n").filter(line => line.startsWith("+") && !line.startsWith("+++")).join("\n");
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/,
  /\bAIza[0-9A-Za-z_-]{30,}\b/,
  /\bgsk_[A-Za-z0-9]{20,}\b/,
  /\bsk-[A-Za-z0-9_-]{24,}\b/,
];
for (const pattern of secretPatterns) if (pattern.test(additions)) throw new Error(`Possible credential or private key added: ${pattern}`);

const dangerous = [
  /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0/i,
  /rejectUnauthorized\s*:\s*false/i,
  /strictSSL\s*:\s*false/i,
  /InsecureSkipVerify\s*:\s*true/i,
  /--tls-allow-insecure/i,
  /dangerouslySetInnerHTML\s*:/,
];
for (const pattern of dangerous) if (pattern.test(additions)) throw new Error(`Potential security downgrade detected: ${pattern}`);

const sensitive = changed.filter(file => protectedArea.test(file));
const testsChanged = changed.some(file => /(^|\/)(__tests__|tests?|spec)(\/|\.)|\.(test|spec)\.[cm]?[jt]sx?$/.test(file));
if (sensitive.length) throw new Error(`AI patches may not modify security-sensitive paths; human intervention is required: ${sensitive.join(", ")}`);
const output = process.env.GITHUB_OUTPUT;
if (output) fs.appendFileSync(output, `protected_area_changed=false\nchanged_files=${changed.length}\n`);
console.log(`Patch safety checks passed for ${changed.length} changed files.`);

