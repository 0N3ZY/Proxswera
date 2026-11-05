# Platform-aware Scramjet architecture

This document defines the platform responsibilities and traffic contract for Scramjet. The machine-readable source of truth is `config/platforms.json`.

## Platform roles

| Platform | Designated responsibility | Must not be used for |
| --- | --- | --- |
| GitHub | Source of truth, code review, CI, provenance, release gates | Serving end-user application traffic |
| Vercel | Frontend build/deployment, static asset CDN, branch previews | Persistent Wisp sessions or primary database |
| Cloudflare | Public ingress, DNS, TLS, filtering, caching and path routing | Durable application state or the main Wisp process |
| Render | Node.js application runtime, Wisp WebSocket sessions, long-lived HTTP work | Source control or static frontend build hosting as the default |
| Supabase | PostgreSQL, authentication, storage, realtime and vector data | Static asset delivery or reverse-proxy ingress |

## Intended request flow

1. Browser requests enter through the Cloudflare Worker once a public hostname is assigned.
2. Frontend navigation and static assets route to the Vercel deployment.
3. `/api/*`, `/healthz` and Wisp WebSocket traffic route to Render.
4. Render accesses Supabase server-side for database, auth and storage operations.
5. GitHub coordinates code changes and checks; it is a control-plane integration, not a request destination.

The current Worker must not be switched to this split route until a successful Vercel preview exists and an end-to-end HTTP plus WebSocket test passes. Until then, keep the current Render origin as the safe fallback.

## Automatic provider discovery

Scramjet reads the registry and the deployment environment. A provider is considered available only when:
- its required configuration is present;
- its URL is a valid HTTPS origin (WSS is used for WebSocket endpoints);
- its health check succeeds where a health endpoint exists; and
- the requested capability is declared by that provider.

Unknown providers are disabled by default. A provider outage may only fall back to another provider when the operation is safe and semantically equivalent. Stateful sessions, authentication, database writes and WebSocket sessions fail closed rather than silently moving to a different service.

## Environment contract

Only set variables for services actually connected to the deployment environment:

- `VERCEL_FRONTEND_ORIGIN`: Vercel deployment origin, no path or credentials.
- `CLOUDFLARE_WORKER_ORIGIN`: public Worker/custom-domain origin after it is configured.
- `RENDER_ORIGIN`: Render runtime origin.
- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_PUBLISHABLE_KEY`: browser-safe publishable key, only where direct client access is intended.
- `SUPABASE_SECRET_KEY`: server-only secret key; never expose it to Vite, browser bundles, logs or preview artifacts.

Never commit credentials. Use platform environment-variable stores. Preview environments must use isolated preview data/credentials; do not point untrusted pull-request previews at production user data.

## Deployment and safety policy

- GitHub pull requests run validation and create isolated previews.
- Vercel previews and Render PR previews are for testing only.
- Production deploys, domain changes, schema migrations and traffic cutovers require an explicit approval gate.
- No paid-plan upgrades or analytics are enabled by this architecture.
- Supabase exposed tables require RLS and policies designed for the actual ownership model.
- No third-party source is installed or executed merely because it was discovered.

## Current integration gaps

This registry is the desired routing contract, not proof that every route is live. Before cutover:
1. Build and test the Vercel frontend from the exact Scramjet branch (including WASM/runtime artifacts).
2. Implement and test the Cloudflare Worker split routing, including WebSocket forwarding.
3. Configure server-side Supabase access and RLS only for features that need persistence.
4. Verify each provider with health checks and confirm the fallback behavior.
5. Keep the Render production service and current public route unchanged until the full path passes.


## Preview and development tooling

Google Cloud Run is an optional preview-only runtime. Beta and experimental revisions are deployed with a unique tag and zero production traffic; the stable revision continues serving normal traffic. The preview workflow is manual, uses GitHub OIDC with Google Workload Identity Federation, and refuses to create missing Cloud Run services or Artifact Registry repositories. Preview deployment must not change public IAM access. Keep minimum instances at zero and cap preview instances.

Context7 and Superpowers are development-time tools, not hosting providers. Context7 supplies current library/API documentation; Superpowers supplies structured planning, TDD, debugging, review and verification workflows. Neither belongs in application traffic routing.

Release channels are Stable (default), Beta (opt-in) and Experimental (opt-in). Beta/Experimental remain isolated from production traffic and are never automatically promoted.

Provider discovery distinguishes configuration from health: a configured provider is marked "not-checked" until an actual health probe succeeds. It must not be presented as healthy based only on environment variables.
