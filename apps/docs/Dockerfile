ARG BUN_IMAGE=docker.io/oven/bun:1.1.12

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
COPY ./apps/docs/package.json ./apps/docs/package.json


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
RUN ./patch-install.sh


# Dev
FROM base AS dev

COPY --from=install-dev /app/node_modules ./node_modules
COPY ./packages/shared ./packages/shared
COPY ./apps/docs ./apps/docs
ENTRYPOINT [ "bun", "run", "--cwd", "/app/apps/docs", "dev" ]


# Build
FROM base AS build

ENV NODE_ENV=production
COPY --from=install-dev /app/node_modules ./node_modules
COPY ./packages ./packages
COPY ./apps/docs ./apps/docs
RUN bun run --cwd ./apps/docs build


# Prod
FROM docker.io/bitnami/nginx:1.25.2 AS prod

USER 0
COPY --chown=1001:0 --chmod=770 --from=build /app/apps/docs/src/.vitepress/dist /opt/bitnami/nginx/html/
COPY --chown=1001:0 --chmod=660 --from=build /app/apps/docs/nginx.conf /opt/bitnami/nginx/conf/server_blocks/default.conf
USER 1001
EXPOSE 8080
