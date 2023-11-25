ARG BASE_IMAGE=docker.io/node:20.10.0-bullseye-slim
ARG APP_VERSION

# Base stage
FROM ${BASE_IMAGE} AS dev

RUN npm install --location=global pnpm@8.6.10
WORKDIR /app
RUN chown node:root /app
COPY --chown=node:root pnpm-workspace.yaml pnpm-lock.yaml ./
RUN pnpm install
COPY --chown=node:root . ./
ENTRYPOINT [ "pnpm", "run", "dev" ]


# Build stage
FROM dev AS build

RUN pnpm run build
RUN pnpm --prod deploy build


# Prod stage
FROM ${BASE_IMAGE}} AS prod

ENV APP_VERSION=$APP_VERSION
RUN mkdir -p /home/node/logs && chmod 770 -R /home/node/logs \
  && mkdir -p /home/node/.npm && chmod 770 -R /home/node/.npm
WORKDIR /app
RUN chown node:root /app
COPY --chown=node:root --from=build /app/build .
USER node
ENTRYPOINT ["npm", "start"]
