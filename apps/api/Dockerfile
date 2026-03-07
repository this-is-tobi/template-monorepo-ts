ARG BUN_IMAGE=docker.io/oven/bun:1.3.10-slim
ARG BUN_IMAGE_PROD=docker.io/oven/bun:1.3.10-distroless

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
COPY packages/playwright/package.json packages/playwright/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/test-utils/package.json packages/test-utils/package.json
COPY packages/ts-config/package.json packages/ts-config/package.json


# =============================================================================
# Install dev - full dependencies (cached until manifests/lockfile change)
# =============================================================================
FROM base AS install-dev

RUN bun install --frozen-lockfile --ignore-scripts


# =============================================================================
# Install prod - production only (cached until manifests/lockfile change)
# Bun's isolated linker stores all packages in node_modules/.bun/ and creates
# per-workspace node_modules/ with relative symlinks.
# =============================================================================
FROM base AS install-prod

RUN bun install --frozen-lockfile --production --ignore-scripts --no-optional --omit=peer


# =============================================================================
# Generate - Prisma client from schema
# =============================================================================
FROM install-dev AS generate

COPY apps/api/prisma/ apps/api/prisma/
COPY apps/api/prisma.config.ts apps/api/prisma.config.ts
RUN bun run --cwd ./apps/api db:generate


# =============================================================================
# Build - compile shared package then bundle API
# =============================================================================
FROM base AS build

ENV NODE_ENV=production
COPY --from=generate /app/node_modules node_modules
COPY packages/ts-config packages/ts-config
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY --from=generate /app/apps/api/src/generated/ apps/api/src/generated/
# Isolated linker places per-workspace deps in workspace node_modules/.
# Since .dockerignore excludes **/node_modules/, restore them from the
# install stage to get the correct Linux-native symlinks.
COPY --from=generate /app/packages/shared/node_modules packages/shared/node_modules
COPY --from=generate /app/apps/api/node_modules apps/api/node_modules
RUN bun run --cwd ./packages/shared build \
  && bun run --cwd ./apps/api build


# =============================================================================
# Dev
# =============================================================================
FROM base AS dev

COPY --from=install-dev /app/node_modules node_modules
COPY packages/ts-config packages/ts-config
COPY packages/shared packages/shared
COPY --from=install-dev /app/packages/shared/node_modules packages/shared/node_modules
COPY apps/api apps/api
COPY --from=install-dev /app/apps/api/node_modules apps/api/node_modules
COPY --from=generate /app/apps/api/src/generated/ apps/api/src/generated/
ENTRYPOINT [ "bun", "run", "--cwd", "/app/apps/api", "dev" ]


# =============================================================================
# Flatten - rewrite workspace symlinks for a flat /app/ layout
#
# Bun's isolated linker creates workspace symlinks with relative paths that
# include the monorepo depth (../../../../node_modules/.bun/...). Stripping
# the "../../../node_modules/" prefix lets them resolve from a flat layout.
# Transitive dependencies stay accessible through the .bun store's own
# internal symlinks.
# =============================================================================
FROM ${BUN_IMAGE} AS flatten

WORKDIR /flat
COPY --from=install-prod /app/node_modules/.bun/ ./node_modules/.bun/
COPY --from=install-prod /app/apps/api/node_modules/ ./node_modules/

# Rewrite workspace symlinks for flat layout.
# In isolated mode symlinks look like ../../../node_modules/.bun/… (non-scoped)
# or ../../../../node_modules/.bun/… (scoped).  Stripping ../../node_modules/
# adjusts the depth so they resolve correctly from /flat/node_modules/.
RUN find node_modules -maxdepth 2 -type l ! -path 'node_modules/.bun/*' \
  | while read -r link; do \
  target=$(readlink "$link"); \
  new_target=$(printf '%s' "$target" | sed 's|\.\./\.\./node_modules/||'); \
  [ "$target" != "$new_target" ] && ln -snf "$new_target" "$link" || true; \
  done

# Prune unused Prisma WASM query compilers (~70MB savings).
# @prisma/client ships compilers for ALL databases (pg, mysql, sqlite, etc.)
# in both "fast" and "small" variants. Keep only the "small" postgresql
# variant referenced by compilerBuild in schema.prisma.
# No official Prisma mechanism exists to install only the needed runtime files.
RUN find node_modules -path '*/@prisma/client/runtime/query_compiler_*' \
  ! -name '*_small_bg.postgresql*' -delete \
  && find node_modules -path '*/@prisma/client/runtime/*.map' -delete \
  && find node_modules -path '*/@prisma/client/runtime/index-browser*' -delete \
  && find node_modules -path '*/@prisma/client/runtime/wasm-compiler-edge*' -delete

# OpenShift: allow arbitrary UIDs in root group (GID 0) to run the app.
# Directories need traverse (775), files only need read (664).
RUN find node_modules -type d -exec chmod 775 {} + \
  && find node_modules -type f -exec chmod 664 {} +


# =============================================================================
# Migrate - run prisma migrate deploy before app starts
#
# Intended as an init container (Kubernetes) or a dependency service
# (docker-compose). Runs "prisma migrate deploy" to apply pending
# migrations, then exits.
# =============================================================================
FROM ${BUN_IMAGE} AS migrate

WORKDIR /app
COPY --from=install-dev /app/node_modules node_modules
COPY --from=install-dev /app/apps/api/node_modules apps/api/node_modules
COPY apps/api/prisma/ apps/api/prisma/
COPY apps/api/prisma.config.ts apps/api/prisma.config.ts
WORKDIR /app/apps/api
ENTRYPOINT [ "bunx", "prisma", "migrate", "deploy" ]


# =============================================================================
# Prod - minimal production image
# =============================================================================
FROM ${BUN_IMAGE_PROD} AS prod

LABEL org.opencontainers.image.source="https://github.com/this-is-tobi/template-monorepo-ts"
LABEL org.opencontainers.image.description="Template Monorepo TS - API"
LABEL org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production
WORKDIR /app

# Pre-flattened node_modules with corrected symlinks, pruned Prisma WASM
# and OpenShift-ready permissions (dirs 775, files 664)
COPY --from=flatten --chown=nonroot:root /flat/node_modules/ ./node_modules/

# Bundled application (single flat directory)
COPY --from=build --chown=nonroot:root /app/apps/api/dist/ ./dist/

USER nonroot
EXPOSE 8080/tcp
ENTRYPOINT [ "bun", "run", "./dist/server.js" ]
