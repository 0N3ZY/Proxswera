import { execFileSync } from "node:child_process";

export function getRepositoryRevision(directory) {
  const revision = execFileSync("git", ["-C", directory, "rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 5000,
  }).trim();

  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(revision)) {
    throw new Error("Repository checkout did not resolve to a full Git commit ID.");
  }

  return revision;
}
