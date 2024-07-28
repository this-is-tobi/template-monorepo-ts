ARG BUN_IMAGE=docker.io/oven/bun:1.1.21
ARG BUN_IMAGE_PROD=docker.io/oven/bun:1.1.21-slim

# Base
FROM ${BUN_IMAGE} AS base

WORKDIR /app
RUN apt update && apt install -y jq && apt clean
COPY ./package.json ./bun.lockb ./ci/scripts/patch-install.sh ./
COPY ./packages/cypress/package.json ./packages/cypress/package.json
COPY ./packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY ./packages/test-utils/package.json ./packages/test-utils/package.json
COPY ./packages/ts-config/package.json ./packages/ts-config/package.json
COPY ./packages/shared/package.json ./packages/shared/package.json
COPY ./apps/api/package.json ./apps/api/package.json


# Install - dev
FROM base AS install-dev

COPY ./packages ./packages
COPY ./apps ./apps
RUN bun install --ignore-scripts


# Install - prod
FROM base AS install-prod

COPY ./packages ./packages
COPY ./apps ./apps
RUN bun install --ignore-scripts --production


# Dev
FROM base AS dev

COPY --from=install-dev /app/node_modules ./node_modules
COPY ./packages/shared ./packages/shared
COPY ./apps/api ./apps/api
ENTRYPOINT [ "bun", "run", "--cwd", "/app/apps/api", "dev" ]


# Build
FROM base AS build

ENV NODE_ENV=production
COPY --from=install-dev /app/node_modules ./node_modules
COPY ./packages ./packages
COPY ./apps/api ./apps/api
RUN bun run --cwd ./packages/shared build


# Prod
FROM ${BUN_IMAGE_PROD} AS prod

ENV NODE_ENV=production
WORKDIR /app
COPY --chown=bun:root --from=install-prod /app/package.json /app/package.json
COPY --chown=bun:root --from=install-prod /app/node_modules /app/node_modules
COPY --chown=bun:root --from=build /app/packages/shared /app/packages/shared
COPY --chown=bun:root --from=build /app/apps/api /app/apps/api
USER bun
EXPOSE 8080/tcp
ENTRYPOINT [ "bun", "run", "--cwd", "/app/apps/api", "start" ]


# # Prod
# FROM ${BUN_IMAGE_PROD} AS prod

# ENV NODE_ENV=production
# COPY --chown=bun:root --from=install-prod /app/apps/api/node_modules /app/node_modules
# COPY --chown=bun:root --from=build /app/apps/api/dist/server.js /app/server.js
# USER bun
# EXPOSE 8080/tcp
# ENTRYPOINT [ "bun", "run", "/app/server.js" ]


# # Prod
# FROM ${BUN_IMAGE_PROD} AS prod

# ENV NODE_ENV=production
# COPY --chown=bun:root --from=install-prod /app/apps/api/node_modules /app/node_modules
# COPY --chown=bun:root --from=build /app/apps/api/dist/bin /app/bin
# USER bun
# EXPOSE 8080/tcp
# ENTRYPOINT [ "/app/bin" ]
