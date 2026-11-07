<h1 align="center">Proxswera</h1>

<!-- The Proxswera logo is awaiting its creator's artwork. Add the approved asset at assets/proxswera-logo.svg when ready. -->

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/StringShot/Proxswera?style=flat&color=orange)](https://github.com/StringShot/Proxswera/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/StringShot/Proxswera?style=flat&color=orange)](https://github.com/StringShot/Proxswera/forks)
[![Upstream engine package](https://img.shields.io/npm/v/@mercuryworkshop/scramjet.svg?maxAge=3600)](https://www.npmjs.com/package/@mercuryworkshop/scramjet)

</div>

---

**Proxswera** is an open-source browser and web proxy built upon the [Scramjet](https://github.com/MercuryWorkshop/scramjet) engine. It is designed to help people access the open web in environments affected by internet censorship and network restrictions.

The project builds on Scramjet's interception, rewriting, and sandboxing techniques. Proxswera is maintained through human contributions, with an emphasis on compatibility, performance, reliability, security, and transparent development.

> Proxswera is a fork and continuing project, not a claim of original authorship over the Scramjet engine. Upstream code, package names, notices, and licence obligations are retained where required.

<div align="center">

[Documentation](https://github.com/StringShot/Proxswera/tree/main/docs) |
[Development guide](https://github.com/StringShot/Proxswera/blob/main/docs/DEVELOPMENT.md) |
[Project progress](https://github.com/StringShot/Proxswera/blob/main/docs/PROJECT-STATUS.md) |
[Upstream documentation](https://github.com/MercuryWorkshop/scramjet/wiki) |
[Upstream community](https://discord.gg/tmApqGqfX2)

</div>

## Features and compatibility

Proxswera inherits the Scramjet engine's browser interception, request rewriting, sandboxing, service-worker, and Wisp transport architecture. The upstream project lists compatibility examples including Google, YouTube, Instagram, ChatGPT, Reddit, X/Twitter, Discord, Spotify, GeForce NOW, and now.gg.

These are inherited upstream examples, not a guarantee that every site or feature currently works in every Proxswera deployment. Compatibility depends on the browser, target site, network, and exact build.

## Run Proxswera locally

### Requirements

- Git (with submodule support)
- Node.js **22.18 or newer, but below 25**
- Corepack and pnpm **10.12.1**
- Rust toolchain via rustup, including the WebAssembly target
- `wasm-bindgen-cli` **0.2.105**
- Binaryen's `wasm-opt`
- The [r58Playz wasm-snip fork](https://github.com/r58Playz/wasm-snip)

The rewriter build uses Rust and WebAssembly tooling. On Windows, use WSL or Git Bash and ensure the Rust toolchain is available in that environment.

Install the Rust/WASM tools before building the rewriter:

```sh
rustup toolchain install nightly --component rust-src --target wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.105
cargo install --git https://github.com/r58playz/wasm-snip
```

Install [Binaryen](https://github.com/WebAssembly/binaryen) using its release for your operating system and ensure `wasm-opt` is on your PATH.

### Clone and install

```sh
git clone --recurse-submodules https://github.com/StringShot/Proxswera.git
cd Proxswera
corepack enable
corepack prepare pnpm@10.12.1 --activate
pnpm install
```

### Build the WebAssembly rewriter

Run from the repository root:

```sh
pnpm --filter @mercuryworkshop/scramjet rewriter:build
```

The Scramjet package retains its upstream npm/workspace name intentionally for compatibility and attribution.

### Start the development server

```sh
pnpm dev
```

Open **http://localhost:4141**. The development server runs the Vite-powered demo and Rspack build/watch process. Rebuild the rewriter after changing its Rust source; it is not automatically rebuilt by the normal development watcher.

To use a different port:

```sh
PORT=4142 pnpm dev
```

PowerShell equivalent:

```powershell
$env:PORT = "4142"
pnpm dev
```

### Run the production container locally

```sh
docker build -t proxswera .
docker run --rm -p 10000:10000 -e NODE_ENV=production -e PORT=10000 proxswera
```

Open **http://localhost:10000**. The production runtime exposes `/healthz`; Wisp WebSocket traffic uses the same host. Production mode intentionally blocks loopback and private-network proxy destinations.

## Project documentation

- [Project status and work completed](docs/PROJECT-STATUS.md) — infrastructure, testing, hardware acceleration research, and known gaps.
- [Development guide](docs/DEVELOPMENT.md)
- [Platform architecture](docs/PLATFORM-ARCHITECTURE.md)
- [Cloud Run previews](docs/CLOUD-RUN-PREVIEWS.md)

## Upstream project and licensing

Proxswera is based on [MercuryWorkshop/Scramjet](https://github.com/MercuryWorkshop/scramjet). Keep upstream attribution, copyright notices, package identifiers, and licence terms intact when modifying or redistributing inherited components. Consult the repository's licence and notices before reuse or redistribution.

## Contributing

Contributions are welcome through issues and pull requests. Please include a clear explanation, tests or reproduction steps, and provenance/licence information when adapting third-party work. Production deployments, database changes, traffic cutovers, and other high-impact operations require explicit maintainer approval.
