ARG BUN_IMAGE=docker.io/oven/bun:1.0.26-slim

# Base
FROM ${BUN_IMAGE} AS base

WORKDIR /app


# Install
FROM base AS install-dev

RUN apt update && apt install -y git && apt clean
COPY ./packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY ./packages/test-utils/package.json ./packages/test-utils/package.json
COPY ./packages/ts-config/package.json ./packages/ts-config/package.json
COPY ./packages/shared/package.json ./packages/shared/package.json
COPY ./apps/api/package.json ./apps/api/bun.lockb ./apps/api/
RUN bun install --frozen-lockfile --ignore-scripts --cwd ./apps/api


# Install
FROM base AS install-prod

RUN apt update && apt install -y git && apt clean
COPY ./packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY ./packages/test-utils/package.json ./packages/test-utils/package.json
COPY ./packages/ts-config/package.json ./packages/ts-config/package.json
COPY ./packages/shared/package.json ./packages/shared/package.json
COPY ./apps/api/package.json ./apps/api/bun.lockb ./apps/api/
RUN bun install --frozen-lockfile --ignore-scripts --production --cwd ./apps/api


# Dev
FROM base AS dev

COPY --from=install-dev /app/apps/api/node_modules ./node_modules
COPY ./apps/api ./apps/api
COPY ./packages ./packages
ENTRYPOINT [ "bun", "run", "--cwd", "/app/apps/api", "dev" ]


# Build
FROM base AS build

ENV NODE_ENV=production
COPY --from=install-dev /app/apps/api/node_modules ./node_modules
COPY ./apps/api ./
RUN bun run build


# Prod
FROM ${BUN_IMAGE} AS prod

ENV NODE_ENV=production
COPY --from=install-prod /app/apps/api/node_modules /app/node_modules
COPY --from=build /app/dist/server.js /app/server.js
USER bun
EXPOSE 8080/tcp
ENTRYPOINT [ "bun", "run", "/app/server.js" ]
