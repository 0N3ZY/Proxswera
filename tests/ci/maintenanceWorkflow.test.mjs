import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = async (name) =>
  readFile(new URL(`../../.github/workflows/${name}`, import.meta.url), "utf8");

test("AI self-healing always leaves repair PRs for human approval", async () => {
  const source = await workflow("self-heal.yml");
  assert.match(source, /gh pr create/);
  assert.doesNotMatch(source, /gh pr merge\b/);
  assert.doesNotMatch(source, /--auto\b/);
});

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
