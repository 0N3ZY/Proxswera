import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../../.github/workflows/main.yml", import.meta.url), "utf8");

test("production releases and GitHub Pages require explicit manual confirmation", () => {
  assert.match(source, /confirm_production_release:/);
  assert.match(source, /required:\s*true/);
  assert.match(source, /default:\s*false/);
  const lines = source.split("\n");
  for (const job of ["upload", "publish", "pages"]) {
    const start = lines.findIndex((line) => line === "  " + job + ":");
    assert.notEqual(start, -1, "Expected " + job + " job");
    let end = lines.findIndex((line, index) => index > start && /^  [a-zA-Z0-9_-]+:$/.test(line));
    if (end === -1) end = lines.length;
    const section = lines.slice(start, end).join("\n");
    assert.match(section, /inputs\.confirm_production_release\s*==\s*true/,
      job + " must require explicit production-release confirmation");
  }
});
