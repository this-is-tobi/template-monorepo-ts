# Base stage
FROM docker.io/node:18.18.0-bullseye-slim AS dev

WORKDIR /app
RUN npm install --location=global pnpm
RUN chown node:node /app
COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install
COPY --chown=node:node src ./src
ENTRYPOINT [ "pnpm", "run", "dev" ]


# Build stage
FROM dev AS build

RUN pnpm run build


# Prod stage
FROM docker.io/bitnami/nginx:1.25.2 AS prod

USER 0
COPY --chown=1001:0 --chmod=770 --from=build /app/src/.vitepress/dist /opt/bitnami/nginx/html/
COPY --chown=1001:0 --chmod=660 ./nginx.conf /opt/bitnami/nginx/conf/server_blocks/default.conf
USER 1001
EXPOSE 8080
