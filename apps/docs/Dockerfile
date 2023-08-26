# Base stage
FROM docker.io/node:18.17.1-bullseye-slim AS base

WORKDIR /app
RUN npm install --location=global pnpm
RUN chown node:node /app
COPY --chown=node:node package.json pnpm-lock.yaml ./
COPY --chown=node:node src ./src


# Dev stage
FROM base AS dev

WORKDIR /app
USER node
RUN pnpm install
ENTRYPOINT [ "pnpm", "run", "dev" ]


# Build stage
FROM base AS build

WORKDIR /app
RUN pnpm install
RUN pnpm run build


# Prod stage
FROM docker.io/bitnami/nginx:1.24.0 AS prod

USER 0
COPY --chown=1001:0 --chmod=770 --from=build /app/src/.vitepress/dist /opt/bitnami/nginx/html/
COPY --chown=1001:0 --chmod=660 ./nginx.conf /opt/bitnami/nginx/conf/server_blocks/default.conf
USER 1001
EXPOSE 8080
