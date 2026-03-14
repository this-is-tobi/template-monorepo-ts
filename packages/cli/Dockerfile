ARG BUN_IMAGE=docker.io/oven/bun:1.3.10-slim

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
# Listed explicitly so installs cache until a manifest or lockfile changes.
COPY apps/api/package.json apps/api/package.json
COPY apps/docs/package.json apps/docs/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/logger/package.json packages/logger/package.json
COPY packages/mcp/package.json packages/mcp/package.json
COPY packages/playwright/package.json packages/playwright/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/test-utils/package.json packages/test-utils/package.json
COPY packages/ts-config/package.json packages/ts-config/package.json


# =============================================================================
# Install - full dependencies (cached until manifests/lockfile change)
# =============================================================================
FROM base AS install

RUN bun install --frozen-lockfile --ignore-scripts


# =============================================================================
# Build - compile shared package then bundle CLI as standalone binary
# =============================================================================
FROM base AS build

ENV NODE_ENV=production
COPY --from=install /app/node_modules node_modules
COPY packages/ts-config packages/ts-config
COPY packages/shared packages/shared
COPY packages/cli packages/cli
# Isolated linker places per-workspace deps in workspace node_modules/.
# Since .dockerignore excludes **/node_modules/, restore them from the
# install stage to get the correct Linux-native symlinks.
COPY --from=install /app/packages/shared/node_modules packages/shared/node_modules
COPY --from=install /app/packages/cli/node_modules packages/cli/node_modules
RUN bun run --cwd ./packages/shared build \
  && bun build --compile --target=bun-linux-x64 \
  packages/cli/src/index.ts \
  --outfile /app/tmts


# =============================================================================
# Prod - minimal production image (distroless)
# =============================================================================
FROM gcr.io/distroless/cc-debian12 AS prod

LABEL org.opencontainers.image.source="https://github.com/this-is-tobi/template-monorepo-ts"
LABEL org.opencontainers.image.description="Template Monorepo TS - CLI"
LABEL org.opencontainers.image.licenses="MIT"

COPY --from=build --chown=nonroot:root /app/tmts /usr/local/bin/tmts

USER nonroot
ENTRYPOINT ["tmts"]
