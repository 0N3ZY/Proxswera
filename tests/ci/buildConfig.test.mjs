import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("pins Node to the supported major and pnpm to the workspace version", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.engines.node, ">=22.18.0 <25");
  assert.equal(packageJson.packageManager, "pnpm@10.12.1");
});


test("Cloudflare config keeps the disabled workers.dev endpoint and preview URLs disabled", async () => {
  const config = JSON.parse(await readFile(new URL("../../wrangler.jsonc", import.meta.url), "utf8"));
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
});


test("workspace declares pnpm and pins Wrangler for Workers Builds", async () => {
  const pkg = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  assert.match(pkg.packageManager, /^pnpm@\d+\.\d+\.\d+$/);
  assert.match(pkg.devDependencies.wrangler, /^\^?4\./);
});

test("pnpm workspace does not retain a stale npm lockfile", async () => {
  await assert.rejects(
    readFile(new URL("../../package-lock.json", import.meta.url)),
    { code: "ENOENT" },
  );
});


test("Cloudflare previews use the PR preview backend rather than production", async () => {
  const config = JSON.parse(await readFile(new URL("../../wrangler.jsonc", import.meta.url), "utf8"));
  assert.equal(config.previews.vars.RENDER_ORIGIN, "https://scramjetfork-pr-1.onrender.com");
  assert.notEqual(config.previews.vars.RENDER_ORIGIN, config.vars.RENDER_ORIGIN);
});
