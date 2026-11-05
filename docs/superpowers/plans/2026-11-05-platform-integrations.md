# Platform Integrations Implementation Plan

> For agentic workers: implement task-by-task with test-first changes on the existing PR branch.

**Goal:** Connect Scramjet's current providers and add a safe, opt-in Cloud Run beta-preview path.

**Architecture:** Keep provider roles explicit in the machine-readable registry. Cloud Run is a preview-only runtime using tagged revisions with no production traffic; Context7 and Superpowers remain development-time capabilities.

**Tech Stack:** Node.js 24, pnpm 10.12.1, GitHub Actions, Docker, Cloudflare Workers/Wrangler, Vercel, Render, Supabase, Google Cloud Run, Workload Identity Federation.

**Spec:** docs/superpowers/specs/2026-11-05-platform-integrations-design.md

## Global Constraints
- No AWS.
- No billing activation, paid upgrades, cloud resource creation, public preview access, production deployment, traffic cutover, PR merge or database migration.
- Cloud Run deploys only through a manual GitHub Actions workflow using OIDC/WIF and a protected environment.
- Cloud Run service and Artifact Registry repository must already exist.
- Cloud Run revisions use no-traffic deployment, minimum instances 0, maximum instances 1, and a unique preview tag.
- No long-lived service-account keys or secrets in source.
- Context7 and Superpowers are development tools, not request-routing providers.
- Provider configuration must not be represented as provider health.

## Review Focus
- A malformed or stale registry must fail closed instead of silently routing to the wrong provider.
- Missing or invalid preview origin/configuration must leave Cloud Run disabled.
- A tagged Cloud Run revision must not receive production traffic or be kept warm by revision-level minimum instances.
- Vercel must not silently select an unpinned future Node major or skip the repository's WASM build.
- WebSocket requests must retain upgrade semantics and must not be converted into ordinary HTTP responses.

---

### Task 1: Provider registry and safe discovery
Files:
- Modify config/platforms.json
- Modify platforms/discovery.js
- Modify tests/ci/platformDiscovery.test.mjs
- Modify docs/PLATFORM-ARCHITECTURE.md

Interfaces:
- discoverPlatforms(env) returns safe provider metadata and configuration state.
- selectPlatform(capability, env) returns a configured candidate or null.
- Cloud Run exposes preview-deployments only; it is not a normal traffic destination.
- developmentTools.context7 and developmentTools.superpowers are development-time metadata.

- [ ] Run node --test tests/ci/platformDiscovery.test.mjs and confirm the new Cloud Run/developer-tool assertions fail for the missing registry entries.
- [ ] Add Cloud Run preview metadata and separate Context7/Superpowers metadata.
- [ ] Detect Cloud Run only when CLOUD_RUN_PREVIEW_ORIGIN is a plain HTTPS origin.
- [ ] Re-run node --test tests/ci/platformDiscovery.test.mjs and confirm all assertions pass.
- [ ] Commit the registry/discovery change.

### Task 2: Guarded Cloud Run preview deployment
Files:
- Create .github/workflows/cloud-run-preview.yml
- Create docs/CLOUD-RUN-PREVIEWS.md
- Modify docs/PLATFORM-ARCHITECTURE.md

Interfaces:
- Manual workflow_dispatch only.
- GitHub environment: cloud-run-preview.
- Required environment variables: GCP_PROJECT_ID, GCP_REGION, GCP_ARTIFACT_REGISTRY_REPOSITORY, CLOUD_RUN_SERVICE, GCP_WORKLOAD_IDENTITY_PROVIDER, GCP_SERVICE_ACCOUNT.
- Authenticate using google-github-actions/auth@v3 with Workload Identity Federation.
- Verify the Artifact Registry repository and Cloud Run service already exist before building/pushing/deploying.
- Deploy a unique tag with no production traffic, minimum instances 0 and maximum instances 1; do not change IAM to allow unauthenticated access.
- Output the preview URL without publishing it to public users automatically.

- [ ] Add a static workflow contract test for manual-only trigger, OIDC permission, no-traffic deployment and no public IAM grant.
- [ ] Run the static test and confirm it fails before the workflow exists.
- [ ] Implement the manual preview workflow and setup guide.
- [ ] Run YAML/static checks and the full relevant CI workflow.
- [ ] Commit the workflow and documentation. Do not dispatch it until Google Cloud billing and credentials are explicitly configured and approved.

### Task 3: Vercel frontend build reliability
Files:
- Modify package.json
- Inspect/modify Vercel build configuration and existing build scripts only as required.
- Test relevant package/build smoke checks.

Interfaces:
- Node engine range must pin the supported major to >=22.18.0 <25.
- Use the repository's declared pnpm version 10.12.1.
- Build must execute the same WASM toolchain and frontend build steps used by the Docker build, or use an equivalent verified build script.

- [ ] Add/update tests for the selected build command and required WASM output.
- [ ] Verify the tests fail against the current unpinned build setup.
- [ ] Pin the Node range and correct Vercel install/build configuration.
- [ ] Verify the WASM artifacts and frontend output exist after build.
- [ ] Commit only after a Vercel preview build succeeds; keep the project paused until deployment safety is confirmed.

### Task 4: Cloudflare edge and WebSocket verification
Files:
- Modify worker/worker.js only if runtime evidence requires it.
- Modify tests/ci/workerProxy.test.mjs and Wrangler test configuration as needed.
- Modify docs/PLATFORM-ARCHITECTURE.md.

Interfaces:
- Frontend HTTP routes use Vercel only after its preview is healthy; otherwise retain Render fallback.
- API, health and Wisp WebSocket traffic use Render.
- WebSocket upgrades must return the original upgrade response; never wrap a 101 response in an ordinary Response.
- Use a Workers runtime test, not only Node fetch mocks.

- [ ] Add a Workers-runtime test for HTTP and WebSocket behavior and observe expected failure or unsupported behavior before changing implementation.
- [ ] Implement only the minimum correction proven by the runtime test.
- [ ] Run Wrangler dry-run and the Workers runtime test.
- [ ] Do not deploy the Worker or change public routing.

### Task 5: Provider readiness and end-to-end verification
Files:
- Modify platforms/discovery.js, devserver.ts, tests and architecture docs only as required.

Interfaces:
- Configuration and health are distinct statuses.
- No secrets are returned from /__platforms.
- Supabase schema stays empty until an application feature requires persistence.

- [ ] Test that configured-but-unhealthy/unchecked providers are not described as healthy.
- [ ] Add provider-specific health checks only where a safe public health endpoint exists.
- [ ] Verify Render preview, Vercel preview, Cloudflare local Worker and Supabase project state.
- [ ] Leave production, database schema and public edge routing unchanged.
