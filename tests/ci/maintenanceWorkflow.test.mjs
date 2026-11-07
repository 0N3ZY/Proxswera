import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = async (name) =>
  readFile(new URL(`../../.github/workflows/${name}`, import.meta.url), "utf8");

test("Cloudflare production deployment is manual and explicitly confirmed", async () => {
  const source = await workflow("cloudflare-pages.yml");
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /confirm_production_deploy:/);
  assert.match(source, /required:\s*true/);
  assert.match(source, /default:\s*false/);
  assert.match(source, /inputs\.confirm_production_deploy\s*==\s*true/);
  assert.doesNotMatch(source, /workflow_run:/);
  assert.doesNotMatch(source, /^\s*push:/m);
  assert.doesNotMatch(source, /^\s*schedule:/m);
});

test("manual Cloudflare production deployment is restricted to trusted main", async () => {
  const source = await workflow("cloudflare-pages.yml");
  assert.match(source, /github\.ref\s*==\s*['"]refs\/heads\/main['"]/);
});

test("runtime smoke checks run when routing registry or Worker files change", async () => {
  const source = await workflow("render-runtime-check.yml");
  for (const path of ["worker/**", "config/**", "platforms/**", "wrangler.jsonc", ".dockerignore"]) {
    assert.ok(source.includes(path), `Runtime workflow should watch ${path}`);
  }
});
