import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../../.github/workflows/main.yml", import.meta.url), "utf8");

test("production releases and GitHub Pages require explicit manual confirmation", () => {
  assert.match(source, /confirm_production_release:/);
  assert.match(source, /required:\\s*true/);
  assert.match(source, /default:\\s*false/);
  for (const job of ["upload", "publish", "pages"]) {
    const match = source.match(new RegExp(`^  ${job}:[\\\\s\\\\S]*?(?=^  [a-zA-Z0-9_-]+:)`, "m"));
    assert.ok(match, `Expected ${job} job`);
    assert.match(match[0], /inputs\\.confirm_production_release\\s*==\\s*true/,
      `${job} must require explicit production-release confirmation`);
  }
});
