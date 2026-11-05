# Proxswera development guide

This guide describes the repository's current local development path.

## Toolchain

| Tool | Version / purpose |
| --- | --- |
| Node.js | `>=22.18.0 <25` |
| pnpm | `10.12.1`, activated through Corepack |
| Rust | rustup-managed toolchain; the container build currently installs nightly |
| Rust target | `wasm32-unknown-unknown` |
| wasm-bindgen-cli | `0.2.105` |
| Binaryen | provides `wasm-opt` |
| wasm-snip | [r58Playz fork](https://github.com/r58Playz/wasm-snip) |

Rust/WebAssembly tools are needed to build the rewriter. A normal frontend edit does not necessarily require rebuilding it.

Install the matching toolchain and binaries:

```sh
rustup toolchain install nightly --component rust-src --target wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.105
cargo install --git https://github.com/r58playz/wasm-snip
```

Install [Binaryen](https://github.com/WebAssembly/binaryen) for your OS and confirm `wasm-opt` is available on `PATH`. The build script specifically invokes `cargo +nightly` and requires wasm-bindgen-cli 0.2.105.

## First-time setup

```sh
git clone --recurse-submodules https://github.com/StringShot/Proxswera.git
cd Proxswera
corepack enable
corepack prepare pnpm@10.12.1 --activate
pnpm install
```

Build the WebAssembly rewriter from the repository root:

```sh
pnpm --filter @mercuryworkshop/scramjet rewriter:build
```

The workspace package intentionally retains its upstream `@mercuryworkshop/scramjet` identifier. This is a compatibility boundary, not the public product name.

## Development server

```sh
pnpm dev
```

The server starts at `http://localhost:4141` by default. It uses Vite middleware for the demo and starts the Rspack build/watch process. Wisp WebSocket traffic is attached to the same local HTTP server.

Set a custom port with `PORT=4142 pnpm dev` on macOS/Linux, or:

```powershell
$env:PORT = "4142"
pnpm dev
```

The rewriter is not rebuilt automatically by the normal development watcher. If you edit its Rust source, rerun the rewriter build command.

## Production image smoke test

The Dockerfile uses a multi-stage build. It compiles the Rust/WASM rewriter and frontend in the build stage, then copies the built demo and Node runtime into the final image.

```sh
docker build -t proxswera .
docker run --rm -p 10000:10000 -e NODE_ENV=production -e PORT=10000 proxswera
```

Useful endpoints:

- `/` — demo frontend.
- `/healthz` — runtime health endpoint.
- `/__platforms` — provider capability/configuration discovery.

Production mode disables Wisp access to loopback and private-network destinations. Do not weaken this boundary to make a local test pass; use the development server for local-only proxy destinations.

## Troubleshooting

- **Missing rewriter/WASM artifacts:** rerun the rewriter build and inspect Rust, wasm-bindgen, Binaryen, and wasm-snip installation.
- **Wrong Node or pnpm version:** check `node --version` and `pnpm --version`.
- **Port already in use:** set `PORT` to another available port.
- **Browser service worker behaves unexpectedly:** use localhost, clear the site's service-worker/cache state, and reload.
- **WebSocket connection fails:** check the browser console and confirm the local server is still listening on the same port.

CI and runtime smoke tests are the authoritative checks for a proposed change. A successful local `pnpm dev` start alone does not prove that the production Docker image, Wisp WebSocket path, or deployment is healthy.
