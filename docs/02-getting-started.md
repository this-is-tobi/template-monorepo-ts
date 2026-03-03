# Getting started

## Prerequisites

The following software must be installed before using this template:

- [Bun](https://bun.sh/) *— all-in-one JavaScript runtime & toolkit (bundler, test runner, package manager).*
- [Docker](https://docker.com/) *— platform for building and running containerised applications.*
- [Helm](https://helm.sh/) *(optional) — package manager for Kubernetes.*
- [Kind](https://kind.sigs.k8s.io/) *(optional) — local Kubernetes clusters using Docker.*
- [Kubectl](https://github.com/kubernetes/kubectl) *(optional) — command-line tool for Kubernetes.*

## Quickstart

```sh
# Clone this template
bunx degit https://github.com/this-is-tobi/template-monorepo-ts <project_name>

# Go to project directory
cd <project_name>

# Init git on the new project
git init

# Init example files
sh ./ci/scripts/init-env.sh

# Install dependencies
bun install

# Build packages
make build
```

## Commands

A full set of commands is available through the [Makefile](../Makefile). Run `make help` to list all available targets.

### Setup

```sh
# Prepare git hooks (husky)
make prepare

# Build all packages and apps
make build

# Remove build artifacts and node_modules
make clean
```

### Development

```sh
# Start development mode (db + turbo dev)
make dev

# Lint the code
make lint

# Format the code
make format
```

### Database

```sh
# Generate Prisma database client
make db-generate

# Deploy Prisma migrations to database
make db-deploy

# Run Prisma migrations in dev mode
make db-migrate

# Reset database and run migrations
make db-reset
```

### Testing

```sh
# Run all unit tests
make test

# Run unit tests with coverage
make test-cov

# Run full validation suite (lint, tests, builds)
make validate

# Run end to end tests - requires `make dev` open in another terminal
make test-e2e
```

### Docker

```sh
# Start dev containers with watch mode
make docker-dev-up

# Start prod containers
make docker-prod-up

# Run e2e tests in dev containers
make docker-e2e

# Run e2e tests in prod containers (CI)
make docker-e2e-ci

# Stop dev or prod containers
make docker-dev-down
make docker-prod-down

# Stop and delete dev or prod containers and volumes
make docker-dev-clean
make docker-prod-clean
```

### Kubernetes

```sh
# Initialize local Kubernetes cluster with kind
make kube-init

# Full dev workflow for Kubernetes (build + deploy)
make kube-dev

# Full prod workflow for Kubernetes (build + deploy)
make kube-prod

# Remove Kubernetes application resources
make kube-down

# Delete Kubernetes cluster
make kube-clean

# Run e2e tests in Kubernetes
make kube-e2e
```

> *__Notes:__ Lower-level `bun run` scripts are also available in [package.json](../package.json) and can target a specific workspace (e.g. `bun run --cwd <package_path> <script_name>`).*

## Access

| Application     | URL (local / docker)             | URL (kubernetes)                   |
| --------------- | -------------------------------- | ---------------------------------- |
| API             | http://localhost:8081            | http://api.domain.local            |
| API *- swagger* | http://localhost:8081/swagger-ui | http://api.domain.local/swagger-ui |
| Documentation   | http://localhost:8082            | http://doc.domain.local            |
| Grafana         | http://localhost:8083            | -                                  |
| Keycloak        | http://localhost:8084            | -                                  |
| Prometheus      | http://localhost:9090            | -                                  |

> *__Notes:__ If containers are healthy but services are not resolved in Kubernetes, check that the domains are mapped to `127.0.0.1` in `/etc/hosts`. The `make kube-init` command handles this automatically.*
