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
COPY ./apps/docs/package.json ./apps/docs/bun.lockb ./apps/docs/
RUN bun install --frozen-lockfile --ignore-scripts --cwd ./apps/docs


# Install
FROM base AS install-prod

RUN apt update && apt install -y git && apt clean
COPY ./packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY ./packages/test-utils/package.json ./packages/test-utils/package.json
COPY ./packages/ts-config/package.json ./packages/ts-config/package.json
COPY ./packages/shared/package.json ./packages/shared/package.json
COPY ./apps/docs/package.json ./apps/docs/bun.lockb ./apps/docs/
RUN bun install --frozen-lockfile --ignore-scripts --production --cwd ./apps/docs


# Dev
FROM base AS dev

COPY --from=install-dev /app/apps/docs/node_modules ./node_modules
COPY ./apps/docs ./apps/docs
COPY ./packages ./packages
ENTRYPOINT [ "bun", "run", "--cwd", "/app/apps/docs", "dev" ]


# Build
FROM base AS build

ENV NODE_ENV=production
COPY --from=install-dev /app/apps/docs/node_modules ./node_modules
COPY ./apps/docs ./
RUN bun run build


# Prod
FROM docker.io/bitnami/nginx:1.25.2 AS prod

USER 0
COPY --chown=1001:0 --chmod=770 --from=build /app/src/.vitepress/dist /opt/bitnami/nginx/html/
COPY --chown=1001:0 --chmod=660 --from=build /app/nginx.conf /opt/bitnami/nginx/conf/server_blocks/default.conf
USER 1001
EXPOSE 8080
