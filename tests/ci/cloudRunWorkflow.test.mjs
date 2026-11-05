import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Cloud Run preview workflow is manual and requires explicit cost confirmation", async () => {
  const workflow = await readFile(new URL("../../.github/workflows/cloud-run-preview.yml", import.meta.url), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /confirm_cloud_costs:/);
  assert.match(workflow, /default:\s*false/);
  assert.match(workflow, /environment:\s*cloud-run-preview/);
});

test("Cloud Run preview uses OIDC and checks existing resources before deployment", async () => {
  const workflow = await readFile(new URL("../../.github/workflows/cloud-run-preview.yml", import.meta.url), "utf8");
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /google-github-actions\/auth@v3/);
  assert.match(workflow, /artifacts repositories describe/);
  assert.match(workflow, /run services describe/);
});

test("Cloud Run preview deploys tagged zero-traffic revisions without public IAM changes", async () => {
  const workflow = await readFile(new URL("../../.github/workflows/cloud-run-preview.yml", import.meta.url), "utf8");
  assert.match(workflow, /--no-traffic/);
  assert.match(workflow, /--tag/);
  assert.match(workflow, /--min 0/);
  assert.match(workflow, /--max 1/);
  assert.doesNotMatch(workflow, /--allow-unauthenticated|services add-iam-policy-binding/);
  assert.match(workflow, /get-iam-policy/);
  assert.match(workflow, /select\(\. == "allUsers" or \. == "allAuthenticatedUsers"\)/);
});

test("Cloud Run preview workflow only runs from trusted main", async () => {
  const workflow = await readFile(new URL("../../.github/workflows/cloud-run-preview.yml", import.meta.url), "utf8");
  assert.match(workflow, /github\.ref\s*==\s*['"]refs\/heads\/main['"]/);
});
