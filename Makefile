NODE_BIN := $(shell pwd)/node_modules/.bin

.DEFAULT_GOAL := help

# helper 
.PHONY: help

help: ## Show this help message
	@echo "This Makefile provides various commands for managing the project."
	@echo ""
	@echo "Usage:"
	@echo "  make <command>"
	@echo ""
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2}'


# Tools
.PHONY: prepare clean compile build build-clean db-generate

prepare: ## Prepare git hooks (husky)
	PATH="$(NODE_BIN):$$PATH" husky

clean: ## Remove build artifacts, temp files, node_modules, etc...
	rm -rf dist coverage .turbo **/node_modules

compile: ## Compile TypeScript in all packages/apps
	PATH="$(NODE_BIN):$$PATH" turbo run compile --color

build: ## Build all packages and apps
	PATH="$(NODE_BIN):$$PATH" turbo run build --color --no-daemon

build-clean: ## Clean build artifacts
	PATH="$(NODE_BIN):$$PATH" turbo run build:clean --color

db-generate: ## Generare database client
	bun run --cwd ./apps/api db:generate


# Local
.PHONY: dev

dev: ## Start development environment (db + turbo dev + cleanup)
	docker compose -f ./docker/docker-compose.dev.yml up db -d; \
	PATH="$(NODE_BIN):$$PATH" turbo run dev --color; \
	docker compose -f ./docker/docker-compose.dev.yml down


# Docker
.PHONY: docker-dev-build docker-dev-up docker-dev-down docker-dev-down-clean \
  docker-prod-build docker-prod-up docker-prod-down docker-prod-down-clean

docker-dev-build: ## Build dev containers
	export BUILDX_BAKE_ENTITLEMENTS_FS=0 && \
	export COMPOSE_FILE=./docker/docker-compose.dev.yml && \
	cd $$(dirname $$COMPOSE_FILE) && \
	docker buildx bake --file $$(basename $$COMPOSE_FILE) --load && \
	cd - > /dev/null

docker-dev-up: ## Start all dev containers and attach to api/docs
	docker compose -f ./docker/docker-compose.dev.yml up -d; \
	docker compose -f ./docker/docker-compose.dev.yml watch --no-up & \
	docker compose -f ./docker/docker-compose.dev.yml attach api docs

docker-dev-down: ## Stop dev containers
	docker compose -f ./docker/docker-compose.dev.yml down

docker-dev-down-clean: ## Delete dev containers and volumes
	docker compose -f ./docker/docker-compose.dev.yml down -v

docker-prod-build: ## Build prod containers
	export BUILDX_BAKE_ENTITLEMENTS_FS=0 && \
	export COMPOSE_FILE=./docker/docker-compose.prod.yml && \
	cd $$(dirname $$COMPOSE_FILE) && \
	docker buildx bake --file $$(basename $$COMPOSE_FILE) --load && \
	cd - > /dev/null

docker-prod-up: ## Start prod containers
	docker compose -f ./docker/docker-compose.prod.yml up

docker-prod-down: ## Stop prod containers
	docker compose -f ./docker/docker-compose.prod.yml down

docker-prod-down-clean: ## Delete prod containers and volumes
	docker compose -f ./docker/docker-compose.prod.yml down -v


# Kubernetes
.PHONY: kube-init kube-dev-build kube-dev-load kube-dev-run kube-dev \
  kube-prod-build kube-prod-load kube-prod-run kube-prod kube-clean kube-delete

kube-init: ## Initialize local Kubernetes cluster with kind
	ci/kind/run.sh -i -d api.domain.local,doc.domain.local

kube-dev-build: ## Build dev images for Kubernetes
	ci/kind/run.sh -c create,build -f docker/docker-compose.dev.yml

kube-dev-load: ## Load dev images for Kubernetes
	ci/kind/run.sh -c create,load -f docker/docker-compose.dev.yml

kube-dev-run: ## Run dev environment in Kubernetes
	ci/kind/run.sh -c create,dev

kube-dev: kube-dev-build kube-dev-run ## Full dev workflow for Kubernetes

kube-prod-build: ## Build prod images for Kubernetes
	ci/kind/run.sh -c create,build -f docker/docker-compose.prod.yml
  
kube-prod-load: ## Load prod images for Kubernetes
	ci/kind/run.sh -c create,load -f docker/docker-compose.prod.yml

kube-prod-run: ## Run prod environment in Kubernetes
	ci/kind/run.sh -c create,prod

kube-prod: kube-prod-build kube-prod-run ## Full prod workflow for Kubernetes

kube-clean: ## Clean Kubernetes cluster
	ci/kind/run.sh -c clean

kube-delete: ## Delete Kubernetes cluster
	ci/kind/run.sh -c delete


# Linting and Formatting
.PHONY: lint format

lint: ## Lint all code using turbo
	PATH="$(NODE_BIN):$$PATH" turbo run lint --color

format: ## Format all code using turbo
	PATH="$(NODE_BIN):$$PATH" turbo run format --color


# Testing
.PHONY: test test-ui test-cov test-e2e test-e2e-ui test-e2e-install

test: ## Run all unit tests
	PATH="$(NODE_BIN):$$PATH" turbo run test --color --no-daemon

test-ui: ## Run unit tests in UI mode
	PATH="$(NODE_BIN):$$PATH" turbo run test:ui --color --no-daemon

test-cov: ## Run unit tests with coverage
	PATH="$(NODE_BIN):$$PATH" turbo run test:cov --color --no-daemon

test-e2e-install: ## Install Playwright browsers
	bun run --cwd ./packages/playwright install:browsers

test-e2e: ## Run Playwright e2e tests
	PATH="$(NODE_BIN):$$PATH" turbo run test:e2e --filter=./packages/playwright --color

test-e2e-ui: ## Run Playwright e2e tests in UI mode
	PATH="$(NODE_BIN):$$PATH" turbo run test:e2e:ui --filter=./packages/playwright --color

docker-e2e: ## Run e2e tests in dev containers
	docker compose -f ./docker/docker-compose.dev.yml up -d; \
	PATH="$(NODE_BIN):$$PATH" turbo run test:e2e; \
	docker compose -f ./docker/docker-compose.dev.yml down

docker-e2e-ui: ## Run e2e tests in prod containers (CI)
	docker compose -f ./docker/docker-compose.prod.yml up -d; \
	sleep 5; \
	PATH="$(NODE_BIN):$$PATH" turbo run test:e2e:ui; \
	docker compose -f ./docker/docker-compose.prod.yml down

kube-e2e: ## Run e2e tests in dev Kubernetes
	TARGET_HOST=api.domain.local TARGET_PORT=80 make kube-dev; \
	PATH="$(NODE_BIN):$$PATH" turbo run test:e2e

kube-e2e-ui: ## Run e2e tests in prod Kubernetes (CI)
	TARGET_HOST=api.domain.local TARGET_PORT=80 make kube-prod; \
	PATH="$(NODE_BIN):$$PATH" turbo run test:e2e:ui

ci: lint test-cov test-e2e ## Run all checks and tests for CI
