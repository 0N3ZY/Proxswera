import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const packageRoot = path.resolve("packages/core");
const manifestPath = path.join(packageRoot, "package.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

assert.equal(manifest.name, "@mercuryworkshop/scramjet", "Unexpected package name");
assert.match(manifest.version, /^\\d+\\.\\d+\\.\\d+/, "Package version must be valid");
assert.ok(Array.isArray(manifest.files) && manifest.files.includes("dist"), "Package must publish dist/");
assert.ok(manifest.exports && typeof manifest.exports === "object", "Package exports must be defined");

const targets = new Set();
for (const field of ["main", "module", "types"]) {
  if (typeof manifest[field] === "string") targets.add(manifest[field]);
}
function collectTargets(value) {
  if (typeof value === "string" && value.startsWith("./")) targets.add(value);
  else if (value && typeof value === "object") {
    for (const nested of Object.values(value)) collectTargets(nested);
  }
}
collectTargets(manifest.exports);

for (const target of targets) {
  assert.ok(!target.includes(".."), `Unsafe package target: ${target}`);
  const absolute = path.resolve(packageRoot, target);
  assert.ok(absolute.startsWith(packageRoot + path.sep), `Package target escapes package root: ${target}`);
  await access(absolute).catch(() => {
    throw new Error(`Published package target is missing: ${target}`);
  });
}

await access(path.join(packageRoot, "dist", "scramjet.wasm"));
console.log(`Validated ${manifest.name}@${manifest.version}: ${targets.size} package entrypoints exist.`);
