import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("pins Node to the supported major and pnpm to the workspace version", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.engines.node, ">=22.18.0 <25");
  assert.equal(packageJson.packageManager, "pnpm@10.12.1");
});
