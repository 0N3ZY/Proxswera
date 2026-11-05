import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const changed = execFileSync("git", ["diff", "--name-only", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
if (!changed.length) throw new Error("AI patch did not change any tracked files.");

const prohibited = /(^|\/)\.github\/|(^|\/)(\.env[^/]*|\.npmrc|\.netrc|\.pypirc|\.git-credentials|\.docker\/config\.json|secrets?(\.[^/]*)?|credentials?(\.[^/]*)?|id_(?:rsa|ed25519|ecdsa)|.*\.(?:pem|p12|pfx|key|jks|keystore|p8|der))$/i;
const prohibitedDir = /(^|\/)(\.ssh|\.aws|\.kube)(\/|$)/i;
const protectedArea = /(^|\/)devserver\.ts$|(^|\/)(auth|authentication|authorization|crypto|cryptography|encryption|tls|ssl|certificates?|security|secrets?|wisp|proxy|transport|network|sandbox|permissions?|sessions?|tokens?)(\/|\.|$)/i;
for (const file of changed) {
  if (prohibited.test(file) || prohibitedDir.test(file) || /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|npm-shrinkwrap\.json|Cargo\.lock)$/.test(file)) {
    throw new Error(`Protected infrastructure/secret/lockfile path changed: ${file}`);
  }
  if (path.isAbsolute(file) || file.split(/[\\/]/).includes("..")) {
    throw new Error(`Unsafe patch path: ${file}`);
  }
  let info;
  try {
    info = fs.lstatSync(file);
  } catch {
    throw new Error(`Unexpected deleted or missing file: ${file}`);
  }
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new Error(`AI patches may only create or modify regular files: ${file}`);
  }
}

const summary = execFileSync("git", ["diff", "--summary", "--"], { encoding: "utf8" });
if (/^(?:\s*(?:rename|copy) (?:from|to) |\s*mode change |\s*(?:create|delete) mode 120000)/m.test(summary)) {
  throw new Error("AI patches may not rename/copy files, change file modes, or create symlinks.");
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
  /\b[A-Z0-9_]*(?:API[_-]?(?:KEY|TOKEN)|ACCESS[_-]?TOKEN|AUTH[_-]?TOKEN|CLIENT[_-]?SECRET|PASSWORD)\s*[:=]\s*["'][^"']{8,}["']/i,
  /https?:\/\/[^/\s:@]+:[^@\s/]+@/i,
];
for (const pattern of secretPatterns) if (pattern.test(additions)) throw new Error(`Possible credential or private key added: ${pattern}`);

const dangerous = [
  /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0/i,
  /rejectUnauthorized\s*:\s*false/i,
  /strictSSL\s*:\s*false/i,
  /InsecureSkipVerify\s*:\s*true/i,
  /--tls-allow-insecure/i,
  /dangerouslySetInnerHTML\s*:/,
  /wisp\.options\.allow_(?:private|loopback)_ips\s*=\s*true/i,
];
for (const pattern of dangerous) if (pattern.test(additions)) throw new Error(`Potential security downgrade detected: ${pattern}`);

const sensitive = changed.filter(file => protectedArea.test(file));
const isTestFile = file => /(^|\/)(__tests__|tests?|spec)(\/|\.)|\.(test|spec)\.[cm]?[jt]sx?$/.test(file) || file === "scripts/smoke-runtime.mjs";
const testsChanged = changed.some(isTestFile);
const applicationSourceChanged = changed.some(file => /\.[cm]?[jt]sx?$/.test(file) && !isTestFile(file));
if (applicationSourceChanged && !testsChanged) {
  throw new Error("Application source changes must include a focused regression test.");
}
if (sensitive.length) throw new Error(`AI patches may not modify security-sensitive paths; human intervention is required: ${sensitive.join(", ")}`);
const output = process.env.GITHUB_OUTPUT;
if (output) fs.appendFileSync(output, `protected_area_changed=false\nchanged_files=${changed.length}\n`);
console.log(`Patch safety checks passed for ${changed.length} changed files.`);

