ARG BUN_IMAGE=docker.io/oven/bun:1.3.10

# =============================================================================
# Base - workspace package manifests for dependency caching
# Install cache only invalidates when a manifest or lockfile changes,
# NOT when source code changes.
# =============================================================================
FROM ${BUN_IMAGE} AS base

WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
# All workspace package.json files for monorepo resolution.
COPY apps/api/package.json apps/api/package.json
COPY apps/docs/package.json apps/docs/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
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
# Dev
# =============================================================================
FROM base AS dev

COPY --from=install /app/node_modules node_modules
COPY packages/shared packages/shared
COPY --from=install /app/packages/shared/node_modules packages/shared/node_modules
COPY apps/docs apps/docs
COPY --from=install /app/apps/docs/node_modules apps/docs/node_modules
ENTRYPOINT [ "bun", "run", "--cwd", "/app/apps/docs", "dev" ]


# =============================================================================
# Build - compile docs for static serving
# =============================================================================
FROM base AS build

ENV NODE_ENV=production
COPY --from=install /app/node_modules node_modules
COPY packages packages
COPY apps/docs apps/docs
# Restore workspace node_modules (isolated linker symlinks)
COPY --from=install /app/apps/docs/node_modules apps/docs/node_modules
RUN bun run --cwd ./apps/docs build


# =============================================================================
# Prod - nginx serving static files
# =============================================================================
FROM docker.io/nginxinc/nginx-unprivileged:1.29.1-alpine-slim AS prod

LABEL org.opencontainers.image.source="https://github.com/this-is-tobi/template-monorepo-ts"
LABEL org.opencontainers.image.description="Template Monorepo TS - Docs"
LABEL org.opencontainers.image.licenses="MIT"

USER 0
COPY --chown=1001:0 --chmod=770 --from=build /app/apps/docs/dist /usr/share/nginx/html/
COPY --chown=1001:0 --chmod=660 --from=build /app/apps/docs/nginx.conf /etc/nginx/conf.d/default.conf
USER 1001
EXPOSE 8080
