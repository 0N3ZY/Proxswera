# Proxswera platform integration and preview-channel design

Date: 2026-11-05
Status: authorised implementation direction

## Intent
Make Proxswera's hosting and development services operate as one platform-aware system. Keep the stable application path dependable while allowing users to opt into isolated beta and experimental builds.

## Goals
- GitHub is the source of truth and release-control plane.
- Cloudflare provides public ingress and request routing.
- Vercel provides frontend builds and static delivery.
- Render remains the primary Node/Wisp runtime.
- Supabase provides application data services.
- Google Cloud Run is an optional preview runtime. New revisions receive tagged preview URLs and no production traffic.
- Context7 and Superpowers are development-time tools, not hosting providers.
- Provider configuration is discovered without exposing credentials or claiming configuration proves health.

## Non-goals
- AWS integration.
- Creating/upgrading Google Cloud billing, enabling APIs, or provisioning Artifact Registry/Cloud Run resources.
- Publicly exposing experimental builds before application access control exists.
- Automatic production traffic migration, PR merges, production deployments or database migrations.
- Supabase schema changes without a separate data/security design.
- Analytics or user tracking.

## Approaches
1. One generic provider list for all services. Rejected: Context7 and Superpowers are not hosting destinations.
2. Separate hosting-provider roles and development-tool capabilities, with Cloud Run preview-only. Selected: explicit responsibilities prevent beta revisions receiving production traffic.
3. Hard-coded routing in the Worker and workflows. Rejected: creates hidden coupling and makes provider changes harder.

## Architecture decisions
- GitHub: code, CI, provenance and release gates.
- Cloudflare: ingress, TLS, filtering and routing.
- Vercel: frontend destination.
- Render: primary application runtime, including Wisp/WebSocket.
- Supabase: data platform, with privileged access server-side.
- Cloud Run: preview-only deployment target. Deploy tagged revisions with no production traffic. Stable traffic remains on the existing revision.
- Cloud Run deployment requires an existing service and Artifact Registry repository, GitHub OIDC/Workload Identity Federation, and a manually triggered workflow using a protected GitHub environment.
- Cloud Run previews use minimum instances 0 and a bounded maximum. Do not enable service-level minimum instances. Revision-level minimum instances must remain zero to avoid idle charges.
- Context7 supplies current documentation to coding agents. Superpowers supplies engineering workflows. Neither is a runtime provider.
- Provider discovery reports configuration separately from health.
- Stateful, authenticated, database-write and WebSocket work must not silently fall back to a semantically different provider.

## Security and cost constraints
- No secrets in source, workflow logs, client bundles or generated artifacts.
- Use GitHub OIDC and Google Workload Identity Federation; do not add long-lived service-account JSON keys.
- Do not create cloud resources automatically. The preview workflow must verify the target service and image repository already exist.
- Do not grant public access to Cloud Run previews in this change.
- No paid-plan upgrades, billing activation, traffic cutover or production changes without explicit approval.
- Keep Render production unchanged. Work on the existing PR branch only.

## Delivery phases
1. Correct and test the provider registry; add Cloud Run preview capability and developer-tool metadata.
2. Add a manual, protected Cloud Run preview workflow and setup documentation; do not provision resources.
3. Repair Vercel's Node/pnpm/WASM build path.
4. Validate Cloudflare HTTP and WebSocket routing against the Workers runtime before any edge deployment.
5. Add end-to-end provider status and release-channel UX after the connections are genuinely healthy.

## Acceptance criteria
- Registry is valid JSON and tests cover Cloud Run preview selection and development-tool separation.
- Cloud Run workflow is inert unless explicitly dispatched and all required GitHub environment variables exist.
- Workflow uses OIDC, deploys a tagged revision with zero traffic, preserves stable traffic, requires an existing service/repository, and does not make previews public.
- Vercel uses a pinned supported Node/pnpm combination and produces required WASM/frontend artifacts.
- Cloudflare proxy tests exercise the Workers runtime, including WebSocket upgrades, not only Node mocks.
- Production remains unchanged; no merges, migrations, paid resources or traffic cutovers occur.
