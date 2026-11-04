import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const queries = (process.env.REUSE_SEARCH_TERMS || "web proxy;browser proxy;service worker proxy;websocket proxy;Wisp;Scramjet browser;Cursor rules")
  .split(";").map(x => x.trim()).filter(Boolean).slice(0, 8);
const maxRepos = Math.max(1, Math.min(8, Number(process.env.REUSE_MAX_REPOS || 5)));
const allowedLicenses = new Set(["mit", "apache-2.0", "bsd-2-clause", "bsd-3-clause", "isc", "agpl-3.0", "gpl-3.0", "mpl-2.0", "unlicense"]);
const candidates = new Map();

async function json(url, headers = {}) {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "ScramjetFork-ResearchBot", ...headers }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) return null;
    return await response.json();
  } catch { return null; }
}
function add(provider, name, url, license, description, stars = 0) {
  if (!url || !/^https:\/\//i.test(url)) return;
  const key = url.replace(/\.git$/i, "").replace(/\/$/, "");
  if (!candidates.has(key)) candidates.set(key, { provider, name: String(name || key).slice(0, 160), url: key + ".git", license: String(license || "unknown").toLowerCase(), description: String(description || "").slice(0, 400), stars: Number(stars) || 0 });
}
for (const q of queries) {
  const gh = await json("https://api.github.com/search/repositories?q=" + encodeURIComponent(q + " in:name,description") + "&sort=stars&order=desc&per_page=10", process.env.GITHUB_TOKEN ? { Authorization: "Bearer " + process.env.GITHUB_TOKEN } : {});
  for (const x of gh?.items || []) add("GitHub", x.full_name, x.clone_url, x.license?.spdx_id, x.description, x.stargazers_count);
  const gl = await json("https://gitlab.com/api/v4/projects?search=" + encodeURIComponent(q) + "&visibility=public&simple=true&order_by=star_count&sort=desc&per_page=10");
  for (const x of Array.isArray(gl) ? gl : []) add("GitLab", x.path_with_namespace, x.http_url_to_repo, x.license?.key, x.description, x.star_count);
  const bb = await json("https://api.bitbucket.org/2.0/repositories?q=" + encodeURIComponent('name ~ "' + q.replace(/"/g, "") + '"') + "&sort=-updated_on&pagelen=10");
  for (const x of bb?.values || []) add("Bitbucket", x.full_name, x.links?.clone?.find(y => y.name === "https")?.href, "unknown", x.description, 0);
  const cg = await json("https://codeberg.org/api/v1/repos/search?q=" + encodeURIComponent(q) + "&limit=10");
  for (const x of cg?.data || []) add("Codeberg", x.full_name, x.clone_url, x.license?.name, x.description, x.stars_count);
}
for (const raw of (process.env.REUSE_REPOSITORIES || "").split(/\s+/).filter(Boolean).slice(0, 10)) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password || !u.hostname.includes(".") || /(^|\.)(localhost|local)$/i.test(u.hostname) || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(u.hostname)) continue;
    add("Configured Git source", raw, raw, "unknown", "Explicitly configured repository; licence must be verified before reuse");
  } catch {}
}
const selected = [...candidates.values()].sort((a,b) => Number(allowedLicenses.has(b.license)) - Number(allowedLicenses.has(a.license)) || b.stars - a.stars).slice(0, maxRepos);
const root = await fs.mkdtemp(path.join(os.tmpdir(), "scramjet-reuse-"));
const records = [];
for (const item of selected) {
  const record = { ...item, licenceApproved: allowedLicenses.has(item.license), files: [] };
  // Research-only checkout: never execute candidate code, hooks, package scripts, or submodules.
  const dir = path.join(root, String(records.length));
  try {
    execFileSync("git", ["clone", "--depth=1", "--filter=blob:none", "--no-checkout", "--", item.url, dir], { stdio: "ignore", timeout: 30000 });
    const names = execFileSync("git", ["-C", dir, "ls-tree", "-r", "--name-only", "HEAD"], { encoding: "utf8", timeout: 10000 }).split("\n").filter(Boolean);
    if (!record.licenceApproved) {
      const licenceFiles = names.filter(n => /(^|\/)(LICENSE|LICENCE|COPYING)(\.[^/]*)?$/i.test(n)).slice(0, 3);
      let licenceText = "";
      for (const name of licenceFiles) {
        try { licenceText += "\n" + execFileSync("git", ["-C", dir, "show", "HEAD:" + name], { encoding: "utf8", maxBuffer: 50000, timeout: 5000 }).slice(0, 12000); } catch {}
      }
      const text = licenceText.toLowerCase();
      const detected = text.includes("gnu affero general public license") ? "agpl-3.0"
        : text.includes("gnu general public license") && text.includes("version 3") ? "gpl-3.0"
        : text.includes("apache license") && text.includes("version 2.0") ? "apache-2.0"
        : text.includes("mozilla public license") && text.includes("2.0") ? "mpl-2.0"
        : text.includes("permission is hereby granted, free of charge") ? "mit"
        : text.includes("redistribution and use in source and binary forms") && text.includes("neither the name") ? "bsd-3-clause"
        : text.includes("redistribution and use in source and binary forms") ? "bsd-2-clause"
        : text.includes("isc license") ? "isc" : "unknown";
      if (detected !== "unknown") record.license = detected;
      record.licenceApproved = allowedLicenses.has(record.license);
    }
    if (record.licenceApproved) {
      const wanted = names.filter(n => /(^|\/)(README(?:\.[^/]*)?|LICENSE(?:\.[^/]*)?|package\.json|Cargo\.toml|go\.mod|pyproject\.toml|[^/]+\.(?:ts|tsx|js|mjs|rs|go|py))$/i.test(n) && !/(^|\/)(node_modules|vendor|dist|build|coverage|\.git)(\/|$)/i.test(n)).slice(0, 24);
      let budget = 10000;
      for (const name of wanted) {
        try {
          const data = execFileSync("git", ["-C", dir, "show", "HEAD:" + name], { encoding: "utf8", maxBuffer: 100000, timeout: 5000 });
          if (data.includes("\0")) continue;
          const excerpt = data.slice(0, Math.min(2200, budget));
          if (excerpt) record.files.push({ path: name, content: excerpt });
          budget -= excerpt.length;
          if (budget <= 0) break;
        } catch {}
      }
    }
  } catch { record.checkoutError = "Could not inspect repository safely"; }
  records.push(record);
}
await fs.rm(root, { recursive: true, force: true });
const output = process.argv[2] || "/tmp/reuse-research.json";
await fs.writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), policy: "Untrusted research only. Never execute source code. Reuse only licence-approved material with attribution and compatible terms.", repositories: records }, null, 2));
console.log("Inspected " + records.length + " candidate repositories; licence-approved: " + records.filter(x => x.licenceApproved).length + ".");
