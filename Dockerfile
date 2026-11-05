# Build stage: the Rust/WASM and frontend toolchains never enter the runtime image.
FROM node:24-bookworm-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git build-essential pkg-config binaryen \
    && rm -rf /var/lib/apt/lists/*

ENV CARGO_HOME=/root/.cargo
ENV RUSTUP_HOME=/root/.rustup
ENV PATH=/root/.cargo/bin:$PATH
ENV CARGO_BUILD_JOBS=1

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain nightly --component rust-src --target wasm32-unknown-unknown
RUN cargo install wasm-bindgen-cli --version 0.2.105
RUN cargo install --git https://github.com/r58playz/wasm-snip

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

COPY . .

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @mercuryworkshop/scramjet rewriter:build
RUN pnpm exec rspack build --mode production
RUN pnpm --filter @mercuryworkshop/scramjet-demo build

# Runtime stage: only Node, the runtime dependencies, server entry point and built frontend.
FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=10000

# Install only the root package's production dependencies. The workspace
# manifests are needed for pnpm's catalog, but the frontend/build packages
# are deliberately excluded from the runtime dependency graph.
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/patches/htmlparser2@12.0.0.patch ./patches/htmlparser2@12.0.0.patch
COPY --from=build /app/packages/core/package.json ./packages/core/package.json
COPY --from=build /app/packages/runway/package.json ./packages/runway/package.json
COPY --from=build /app/packages/rpc/package.json ./packages/rpc/package.json
COPY --from=build /app/packages/controller/package.json ./packages/controller/package.json
COPY --from=build /app/packages/utils/package.json ./packages/utils/package.json
COPY --from=build /app/packages/demo/package.json ./packages/demo/package.json
COPY --from=build /app/packages/bootstrap/package.json ./packages/bootstrap/package.json
COPY --from=build /app/packages/create-proxy-app/package.json ./packages/create-proxy-app/package.json
RUN pnpm install --prod --filter proxswera-root --no-frozen-lockfile \
    && rm -f pnpm-lock.yaml \
    && rm -rf /root/.cache/node/corepack /root/.local/share/pnpm/store

COPY --from=build --chown=node:node /app/devserver.ts ./devserver.ts
COPY --from=build --chown=node:node /app/platforms ./platforms
COPY --from=build --chown=node:node /app/config/platforms.json ./config/platforms.json
COPY --from=build --chown=node:node /app/packages/demo/dist ./packages/demo/dist

USER node

EXPOSE 10000
CMD ["./node_modules/.bin/tsx", "devserver.ts"]
