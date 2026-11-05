import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getRepositoryRevision } from "../../.github/scripts/reuse-provenance.mjs";

test("records the exact full Git commit used for repository research", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "scramjet-provenance-"));
  try {
    execFileSync("git", ["init", "--quiet", directory]);
    execFileSync("git", ["-C", directory, "config", "user.name", "Scramjet Test"]);
    execFileSync("git", ["-C", directory, "config", "user.email", "scramjet-test@example.invalid"]);
    await writeFile(path.join(directory, "README.md"), "provenance test\n");
    execFileSync("git", ["-C", directory, "add", "README.md"]);
    execFileSync("git", ["-C", directory, "commit", "--quiet", "-m", "fixture"]);
    const expected = execFileSync("git", ["-C", directory, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    assert.match(expected, /^[0-9a-f]{40}$/);
    assert.equal(getRepositoryRevision(directory), expected);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("cross-host research stores the inspected commit in each source record", async () => {
  const source = await (await import("node:fs/promises")).readFile(
    new URL("../../.github/scripts/discover-reuse.mjs", import.meta.url),
    "utf8",
  );
  assert.match(source, /record\.revision\s*=\s*getRepositoryRevision\(dir\)/);
});
