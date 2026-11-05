# Proxswera project status and development history

**Snapshot date:** 2026-11-05  
**Repository:** [StringShot/Proxswera](https://github.com/StringShot/Proxswera)  
**Upstream:** [MercuryWorkshop/Scramjet](https://github.com/MercuryWorkshop/scramjet)

This is an evidence-based snapshot of work recorded in the repository and project discussions. It separates implemented code, tested behaviour, configured services, experiments, and future ideas. A configured account or workflow is not proof of a live production integration.

## Product identity

Proxswera is an open-source browser and web proxy based on Scramjet. It aims to help users access the open web in environments affected by internet censorship and network restrictions.

The GitHub repository has been renamed to `StringShot/Proxswera`. The product description and local setup instructions are in the README; the wider rebrand is being applied on the maintenance PR branch.

- **Logo:** awaiting the project owner's original artwork. Planned README asset: `assets/proxswera-logo.svg`.
- **Demo favicon:** `packages/demo/public/icon.png` remains the inherited upstream icon and should be replaced when the new artwork is supplied.
- **Upstream package identifiers:** names such as `@mercuryworkshop/scramjet` are intentionally retained for compatibility and attribution.

## Engineering work implemented in the maintenance branch

### Runtime and build pipeline

The open maintenance PR contains work to:
- Build the Rust/WebAssembly rewriter and frontend in a Docker build stage.
- Use a smaller Node.js runtime stage rather than carrying the full Rust/frontend toolchain into production.
- Serve compiled frontend assets through a lightweight Node HTTP server in production.
- Keep Vite middleware and the Rspack build/watch process for local development.
- Attach the Wisp WebSocket endpoint to the same HTTP server.
- Add `/healthz` and `/__platforms` endpoints.
- Add static asset handling, MIME types, cache headers, HEAD support, SPA navigation fallback, and real 404s for missing assets.
- Reject encoded path traversal and symlink escapes from the static build directory.
- Restrict production proxying from reaching loopback/private-network destinations.

### Validation

The repository contains CI checks, package-structure checks, workflow policy tests, platform-discovery tests, Worker proxy tests, and production runtime smoke tests.

Runtime smoke coverage includes HTTP and HEAD requests, static assets, SPA fallback, missing assets, path traversal, symlink escapes, unsupported methods, and a Wisp WebSocket handshake.

Earlier revisions of the maintenance PR recorded successful CI and Docker/runtime smoke runs. The latest PR head must be checked separately; an earlier successful run does not certify later commits. No production merge or production deployment is implied by those test results.

## Hardware acceleration and device optimisation

**Status: researched/planned; no Proxswera-specific hardware-acceleration implementation has been completed or verified.**

Ideas discussed for future investigation:
- Capability detection before selecting an acceleration path.
- WebGPU as an optional path, with WebGL and CPU fallbacks.
- WebAssembly SIMD for suitable CPU-bound processing.
- Web Workers for work that can safely move off the browser main thread.
- Repeatable benchmarks for startup time, throughput, CPU, memory, and responsiveness.
- Compatibility testing across NVIDIA, AMD, Intel, and Apple GPUs, plus Android/iOS devices and major browsers.

A browser application cannot install GPU drivers or directly control a graphics driver. GPU access is mediated by the browser, OS, and device. Rendering of websites loaded through the proxy remains primarily handled by the user's browser and device. Do not advertise WebGPU, WebGL, SIMD, or worker-based acceleration until code, fallback behaviour, and tests exist.

## Platforms and tools used or investigated

| Platform / tool | Recorded use and current state |
| --- | --- |
| **GitHub** | Primary source repository, pull requests, Actions CI, maintenance workflows, upstream sync, AI repair/review and provenance records. |
| **Render** | Primary Node/Wisp runtime target. Production and PR-preview services exist under legacy `scramjetfork` service names. Docker build/runtime smoke validation has been performed; production settings and traffic have intentionally not been changed as part of this rebrand. |
| **Vercel** | Frontend build/deployment platform investigated and connected to the repository. The project was paused after a build issue involving `packages/core/rewriter/wasm/rewriter_bg.wasm`. It is not a verified live frontend route. |
| **Cloudflare Workers** | Worker routing code and Wrangler configuration exist. The existing account Worker was a dashboard-generated Hello World rather than a verified Proxswera edge deployment; the account's `workers.dev` subdomain was disabled. No production edge cutover has occurred. |
| **Cloudflare Pages** | A deployment workflow exists, but the intended frontend split-routing path is not verified end to end. |
| **Supabase** | A project exists for future data/auth/storage capabilities. At the recorded inspection it was healthy but had no application tables; no application schema or production data integration had been completed. |
| **Google Cloud Run** | A manual, protected, preview-only workflow and documentation were added. No Cloud Run service or Artifact Registry resource was provisioned; this remains inactive pending explicit cost/billing approval. |
| **Context7** | Development-time documentation lookup for current library/API references. Not part of application request routing. |
| **Superpowers** | Development-time engineering workflow support for planning, TDD, debugging, review, and verification. Not a hosting provider. |
| **Docker** | Reproducible multi-stage production image build and isolated runtime smoke testing. |
| **Node.js, pnpm, Rust, WebAssembly, Vite, Rspack** | Core development/build toolchain. |
| **GitHub, GitLab, Bitbucket, Codeberg** | Public source-host discovery targets for research/reuse. Other HTTPS Git hosts can be configured; Cursor ecosystem repositories are discoverable as public projects, but there is no confirmed dedicated Cursor Origins API integration. |

### AI provider integrations

The maintenance workflows contain adapters/configuration for Google Gemini, Groq, OpenRouter, Mistral, and Cloudflare Workers AI. These are supported provider options in automation code, not proof that every provider credential is configured, available, or actively used. Provider quotas and terms can change; model-name selection alone cannot guarantee that provider-side billing will never occur.

Private ChatGPT, Cursor, Claude, and Gemini conversation histories are not automatically accessible to GitHub Actions. Only explicitly selected, non-secret lessons should be added to project memory.

## AI maintenance and open-source research

Implemented workflow/code paths include:
- Scheduled/manual self-healing checks that can request repair proposals from multiple model providers.
- Distinct patch-author, security-reviewer, and independent-reviewer roles.
- Deterministic patch verification and test/build gates before a repair PR is opened.
- Daily upstream Scramjet sync proposals on dedicated branches.
- AI-assisted optimisation proposals after upstream changes.
- Public repository discovery across GitHub, GitLab, Bitbucket, and Codeberg, plus configured HTTPS Git repositories.
- Licence/provenance checks; candidate projects are research inputs and are not installed or executed by discovery.
- Shared durable project memory in `docs/AI-PROJECT-MEMORY.md`.

These workflows propose changes through pull requests. They do not authorise automatic application merges or production deployments.

## Intended platform architecture

- **GitHub:** source of truth, review, CI and release gates.
- **Cloudflare:** future edge ingress, TLS and routing.
- **Vercel:** frontend build and static delivery once the WASM build is fixed and validated.
- **Render:** primary Node/Wisp runtime.
- **Supabase:** future application data services where needed.
- **Cloud Run:** optional isolated beta/experimental previews only.
- **Context7 and Superpowers:** development-time tools.

This is a target architecture, not a claim that all traffic currently flows through all providers. Stateful/authenticated/API/WebSocket paths must fail closed rather than silently move to an incompatible provider. Production changes, domain changes, traffic cutovers, database migrations, paid resources, and PR merges remain approval-gated.

## Current gaps

- New logo and favicon are waiting for the owner's design.
- Maintenance PR remains open and unmerged. Its latest checks must pass on its final commit before it is considered validated.
- Vercel's WASM/frontend build path needs repair and a successful preview.
- Cloudflare Worker routing needs a Workers-runtime HTTP and WebSocket test before deployment.
- Supabase needs a separately reviewed data/security design before schema changes.
- Cloud Run remains inactive until cost and billing are explicitly approved.
- Hardware acceleration remains research/planning, not an implemented feature.
- No final public domain or production traffic cutover has been established in this snapshot.

## Change log snapshot

| Date | Work recorded |
| --- | --- |
| 2026-11-04 | Runtime optimisation and AI maintenance work developed on the maintenance PR branch; production Docker/runtime validation passed on earlier revisions. |
| 2026-11-05 | Platform architecture, provider registry, manual Cloud Run preview design, AI project memory, cross-host reuse research, and additional runtime/CI checks added to maintenance work. |
| 2026-11-05 | GitHub repository renamed to Proxswera and its README introduction updated on the default branch. |
| 2026-11-05 | Product identity, local setup, demo titles, and progress documentation updated on the maintenance PR branch. |
