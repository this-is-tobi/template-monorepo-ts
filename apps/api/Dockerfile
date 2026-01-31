ARG BUN_IMAGE=docker.io/oven/bun:1.3.8
ARG BUN_IMAGE_PROD=docker.io/oven/bun:1.3.8-slim

# Base
FROM ${BUN_IMAGE} AS base

WORKDIR /app
COPY ./package.json ./bun.lock ./
COPY ./packages/ts-config/package.json ./packages/ts-config/package.json
COPY ./packages/shared/package.json ./packages/shared/package.json
COPY ./apps/api/package.json ./apps/api/package.json


# Install - dev
FROM base AS install-dev

COPY ./packages ./packages
COPY ./apps ./apps
RUN bun install --ignore-scripts --frozen-lockfile
RUN bun run --cwd ./apps/api db:generate


# Dev
FROM base AS dev

COPY --from=install-dev /app/node_modules ./node_modules
COPY ./packages/shared ./packages/shared
COPY ./apps/api ./apps/api
ENTRYPOINT [ "bun", "run", "--cwd", "/app/apps/api", "dev" ]


# Install - prod
FROM base AS install-prod

COPY ./packages ./packages
COPY ./apps ./apps
RUN bun install --ignore-scripts --production --frozen-lockfile --no-optional
RUN bun run --cwd ./apps/api db:generate


# Build
FROM base AS build

ENV NODE_ENV=production
COPY --from=install-dev /app/node_modules ./node_modules
COPY ./packages ./packages
COPY ./apps/api ./apps/api
RUN bun run --cwd ./packages/shared build
RUN bun run --cwd ./apps/api build


# Prod
FROM ${BUN_IMAGE_PROD} AS prod

ENV NODE_ENV=production
COPY --chown=bun:root --from=install-prod /app/node_modules /app/node_modules
COPY --chown=bun:root --from=build /app/apps/api/package.json /app/
COPY --chown=bun:root --from=build /app/apps/api/prisma/ /app/prisma/
COPY --chown=bun:root --from=build /app/apps/api/dist/ /app/
# Create symlinks for Prisma modules in bun's isolated structure
RUN mkdir -p /app/node_modules/@prisma \
  && ln -sf /app/node_modules/.bun/prisma@*/node_modules/prisma /app/node_modules/prisma
USER bun
EXPOSE 8080/tcp
ENTRYPOINT [ "bun", "run", "/app/server.js" ]


# Prod
# FROM ${BUN_IMAGE_PROD} AS prod

# ENV NODE_ENV=production
# COPY --chown=bun:root --from=install-prod /app/node_modules /app/node_modules
# COPY --chown=bun:root --from=build /app/apps/api/package.json /app/
# COPY --chown=bun:root --from=build /app/apps/api/prisma/ /app/prisma/
# COPY --chown=bun:root --from=build /app/apps/api/dist/bin /app/bin
# USER bun
# EXPOSE 8080/tcp
# ENTRYPOINT [ "/app/bin" ]
