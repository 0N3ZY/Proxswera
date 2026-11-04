FROM node:24-bookworm-slim

WORKDIR /app

# The Scramjet rewriter is compiled to WebAssembly as part of the image build.
# Keep the Rust build single-threaded to reduce peak memory use on small builders.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git build-essential pkg-config binaryen \
    && rm -rf /var/lib/apt/lists/*

ENV CARGO_HOME=/root/.cargo
ENV RUSTUP_HOME=/root/.rustup
ENV PATH=/root/.cargo/bin:$PATH
ENV CARGO_BUILD_JOBS=1
ENV NODE_ENV=production

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain nightly --component rust-src --target wasm32-unknown-unknown
RUN cargo install wasm-bindgen-cli --version 0.2.105
RUN cargo install --git https://github.com/r58playz/wasm-snip

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

# Copy the full workspace before installing: pnpm-workspace.yaml contains
# the dependency catalog and each package manifest is needed by pnpm.
COPY . .

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @mercuryworkshop/scramjet rewriter:build
RUN pnpm exec rspack build --mode production

EXPOSE 10000
CMD ["pnpm", "start"]
