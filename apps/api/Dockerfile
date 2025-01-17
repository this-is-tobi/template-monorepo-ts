ARG BUN_IMAGE=docker.io/oven/bun:1.1.45
ARG BUN_IMAGE_PROD=docker.io/oven/bun:1.1.45-slim

# Base
FROM ${BUN_IMAGE} AS base

WORKDIR /app
COPY ./package.json ./bun.lockb ./
COPY ./packages/cypress/package.json ./packages/cypress/package.json
COPY ./packages/test-utils/package.json ./packages/test-utils/package.json
COPY ./packages/ts-config/package.json ./packages/ts-config/package.json
COPY ./packages/shared/package.json ./packages/shared/package.json
COPY ./apps/api/package.json ./apps/api/package.json


# Install - dev
FROM base AS install-dev

# Following line is needed for Prisma (see. https://github.com/oven-sh/bun/issues/5320)
COPY --from=docker.io/node:20 /usr/local/bin/node /usr/local/bin/node
COPY ./packages ./packages
COPY ./apps ./apps
RUN bun install --ignore-scripts --frozen-lockfile
RUN bun run --cwd ./apps/api db:generate


# Install - prod
FROM base AS install-prod

# Following line is needed for Prisma (see. https://github.com/oven-sh/bun/issues/5320)
COPY --from=docker.io/node:20 /usr/local/bin/node /usr/local/bin/node
COPY ./packages ./packages
COPY ./apps ./apps
RUN bun install --ignore-scripts --production --frozen-lockfile
RUN bun run --cwd ./apps/api db:generate


# Dev
FROM base AS dev

COPY --from=install-dev /app/node_modules ./node_modules
COPY ./packages/shared ./packages/shared
COPY ./apps/api ./apps/api
ENTRYPOINT [ "bun", "run", "--cwd", "/app/apps/api", "dev" ]


# Build
FROM base AS build

ENV NODE_ENV=production
COPY --from=install-prod /app/node_modules ./node_modules
COPY ./packages ./packages
COPY ./apps/api ./apps/api
RUN bun run --cwd ./packages/shared build
RUN bun run --cwd ./apps/api build


# Prod
FROM ${BUN_IMAGE_PROD} AS prod

ENV NODE_ENV=production
# Following line is needed for Prisma (see. https://github.com/oven-sh/bun/issues/5320)
COPY --from=docker.io/node:20 /usr/local/bin/node /usr/local/bin/node 
COPY --chown=bun:root --from=install-prod /app/node_modules /app/node_modules
COPY --chown=bun:root --from=build /app/apps/api/src/prisma/schema.prisma /app/schema.prisma
COPY --chown=bun:root --from=build /app/apps/api/dist/server.js /app/server.js
USER bun
EXPOSE 8080/tcp
ENTRYPOINT [ "bun", "run", "/app/server.js" ]


# # Prod
# FROM ${BUN_IMAGE_PROD} AS prod

# ENV NODE_ENV=production
# Following line is needed for Prisma (see. https://github.com/oven-sh/bun/issues/5320)
# COPY --from=docker.io/node:20 /usr/local/bin/node /usr/local/bin/node
# COPY --chown=bun:root --from=install-prod /app/node_modules /app/node_modules
# COPY --chown=bun:root --from=build /app/apps/api/src/prisma/schema.prisma /app/schema.prisma
# COPY --chown=bun:root --from=build /app/apps/api/dist/bin /app/bin
# USER bun
# EXPOSE 8080/tcp
# ENTRYPOINT [ "/app/bin" ]
