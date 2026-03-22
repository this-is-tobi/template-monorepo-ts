ARG BUN_IMAGE=docker.io/oven/bun:1.3.11-slim
ARG BUN_IMAGE_PROD=docker.io/oven/bun:1.3.11-distroless

# =============================================================================
# Base - workspace package manifests for dependency caching
# Install cache only invalidates when a manifest or lockfile changes,
# NOT when source code changes.
# =============================================================================
FROM ${BUN_IMAGE} AS base

WORKDIR /app
# Root manifest + lockfile + linker config
COPY package.json bun.lock bunfig.toml ./
# All workspace package.json files for monorepo resolution.
COPY --parents apps/*/package.json packages/*/package.json ./


# =============================================================================
# Install - full dependencies (cached until manifests/lockfile change)
# =============================================================================
FROM base AS install

RUN bun install --frozen-lockfile --ignore-scripts


# =============================================================================
# Build - compile shared package then bundle MCP server as JS entry
# =============================================================================
FROM base AS build

ENV NODE_ENV=production
COPY --from=install /app/node_modules node_modules
COPY packages/ts-config packages/ts-config
COPY packages/shared packages/shared
COPY packages/logger packages/logger
COPY apps/mcp apps/mcp
# Isolated linker places per-workspace deps in workspace node_modules/.
# Since .dockerignore excludes **/node_modules/, restore them from the
# install stage to get the correct Linux-native symlinks.
COPY --from=install /app/packages/shared/node_modules packages/shared/node_modules
COPY --from=install /app/packages/logger/node_modules packages/logger/node_modules
COPY --from=install /app/apps/mcp/node_modules apps/mcp/node_modules
RUN bun run --cwd ./packages/shared build \
  && bun run --cwd ./packages/logger build \
  && bun build ./apps/mcp/src/index.ts --outdir ./apps/mcp/dist --target node


# =============================================================================
# Prod - minimal production image
# =============================================================================
FROM ${BUN_IMAGE_PROD} AS prod

LABEL org.opencontainers.image.source="https://github.com/this-is-tobi/template-monorepo-ts"
LABEL org.opencontainers.image.description="Template Monorepo TS - MCP Server"
LABEL org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=nonroot:root /app/apps/mcp/dist/ ./dist/

# Default HTTP transport port — configurable via TMTS_HTTP_PORT
EXPOSE 3100

USER nonroot
ENTRYPOINT ["bun", "run", "./dist/index.js"]
