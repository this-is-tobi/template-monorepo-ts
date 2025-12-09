# =============================================================================
# Template Monorepo TypeScript - Makefile
# =============================================================================

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------

# Colors for terminal output
COLOR_RESET   := \033[0m
COLOR_BOLD    := \033[1m
COLOR_DIM     := \033[2m
COLOR_RED     := \033[31m
COLOR_GREEN   := \033[32m
COLOR_YELLOW  := \033[33m
COLOR_BLUE    := \033[34m
COLOR_MAGENTA := \033[35m
COLOR_CYAN    := \033[36m

# Paths
PROJECT_ROOT  := $(shell pwd)
NODE_BIN      := $(PROJECT_ROOT)/node_modules/.bin
API_DIR       := $(PROJECT_ROOT)/apps/api
PLAYWRIGHT_DIR := $(PROJECT_ROOT)/packages/playwright

# Docker compose files
DOCKER_DIR       := $(PROJECT_ROOT)/docker
COMPOSE_DEV      := $(DOCKER_DIR)/docker-compose.dev.yml
COMPOSE_PROD     := $(DOCKER_DIR)/docker-compose.prod.yml

# Kubernetes
KIND_SCRIPT      := $(PROJECT_ROOT)/ci/kind/run.sh
KUBE_DOMAINS     := api.domain.local,doc.domain.local

# Runtime
BUN              := bun
TURBO            := $(BUN) run turbo
DOCKER_COMPOSE   := docker compose

# Turbo flags
TURBO_COLOR      := --color
TURBO_NO_DAEMON  := --no-daemon

# -----------------------------------------------------------------------------
# Special targets
# -----------------------------------------------------------------------------

# Disable implicit rules and built-in suffix rules to prevent file completion
.SUFFIXES:
MAKEFLAGS += --no-builtin-rules

# Mark all targets as phony (non-file targets) to avoid file name completion
.PHONY: help prepare clean compile build build-clean \
	db-generate db-deploy db-migrate db-reset \
	dev lint lint-root format format-root \
	test test-ui test-cov test-e2e test-e2e-install test-e2e-ui \
	docker-dev-build docker-dev docker-dev-clean docker-dev-delete docker-e2e \
	docker-prod-build docker-prod docker-prod-clean docker-prod-delete docker-e2e-ci \
	kube-init kube-clean kube-delete \
	kube-dev-build kube-dev-load kube-dev-run kube-dev kube-e2e \
	kube-prod-build kube-prod-load kube-prod-run kube-prod kube-e2e-ui \
	ci

# -----------------------------------------------------------------------------
# Default target
# -----------------------------------------------------------------------------

.DEFAULT_GOAL := help

# -----------------------------------------------------------------------------
# Help
# -----------------------------------------------------------------------------

.PHONY: help
help: ## Show this help message
	@echo ""
	@echo "$(COLOR_BOLD)$(COLOR_CYAN)╔═════════════════════════════════════════════════════╗$(COLOR_RESET)"
	@echo "$(COLOR_BOLD)$(COLOR_CYAN)║$(COLOR_RESET)  $(COLOR_BOLD)Template Monorepo TypeScript - Available Commands$(COLOR_RESET)  $(COLOR_BOLD)$(COLOR_CYAN)║$(COLOR_RESET)"
	@echo "$(COLOR_BOLD)$(COLOR_CYAN)╚═════════════════════════════════════════════════════╝$(COLOR_RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; category=""} \
		/^## / { \
			category = substr($$0, 4); \
			printf "\n$(COLOR_BOLD)$(COLOR_YELLOW)%s$(COLOR_RESET)\n", category; \
		} \
		/^[a-zA-Z_-]+:.*?## / { \
			if (category != "") { \
				printf "  $(COLOR_CYAN)%-28s$(COLOR_RESET) %s\n", $$1, $$2; \
			} \
		}' $(MAKEFILE_LIST)
	@echo ""

# -----------------------------------------------------------------------------
## ▸ Setup & Tools
# -----------------------------------------------------------------------------

.PHONY: prepare
prepare: ## Prepare git hooks (husky)
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Installing git hooks..."
	@PATH="$(NODE_BIN):$$PATH" husky
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Git hooks installed"

.PHONY: clean
clean: ## Remove build artifacts and node_modules
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Cleaning project..."
	@rm -rf dist coverage .turbo **/node_modules **/.eslintcache
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Project cleaned"

# -----------------------------------------------------------------------------
## ▸ Build & Compile
# -----------------------------------------------------------------------------

.PHONY: compile
compile: ## Compile TypeScript in all packages/apps
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Compiling TypeScript..."
	@$(TURBO) run compile $(TURBO_COLOR)
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Compilation complete"

.PHONY: build
build: ## Build all packages and apps
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Building project..."
	@$(TURBO) run build $(TURBO_COLOR) $(TURBO_NO_DAEMON)
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Build complete"

.PHONY: build-clean
build-clean: ## Clean build artifacts
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Cleaning build artifacts..."
	@$(TURBO) run build:clean $(TURBO_COLOR)
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Build artifacts cleaned"

# -----------------------------------------------------------------------------
## ▸ Database
# -----------------------------------------------------------------------------

.PHONY: db-generate
db-generate: ## Generate Prisma database client
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Generating Prisma client..."
	@$(BUN) run --cwd $(API_DIR) db:generate
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Prisma client generated"

.PHONY: db-deploy
db-deploy: ## Deploy Prisma migrations to database
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Deploying database migrations..."
	@$(BUN) run --cwd $(API_DIR) migrate deploy
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Migrations deployed"

.PHONY: db-migrate
db-migrate: ## Run Prisma migrations in dev mode
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Running database migrations..."
	@$(BUN) run --cwd $(API_DIR) migrate dev
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Migrations applied"

.PHONY: db-reset
db-reset: ## Reset database and run migrations
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Resetting database..."
	@$(BUN) run --cwd $(API_DIR) migrate reset
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Database reset complete"

# -----------------------------------------------------------------------------
## ▸ Development
# -----------------------------------------------------------------------------

.PHONY: dev
dev: ## Start development environment (db + turbo dev)
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Starting development environment..."
	@$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) up db -d && \
	$(TURBO) run dev $(TURBO_COLOR); \
	$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) down

# -----------------------------------------------------------------------------
## ▸ Linting & Formatting
# -----------------------------------------------------------------------------

.PHONY: lint
lint: ## Lint all code
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Linting code..."
	@$(TURBO) run lint $(TURBO_COLOR)

.PHONY: lint-root
lint-root: ## Lint root-level files only
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Linting root files..."
	@$(NODE_BIN)/eslint .

.PHONY: format
format: ## Format all code
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Formatting code..."
	@$(TURBO) run format $(TURBO_COLOR)

.PHONY: format-root
format-root: ## Format root-level files only
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Formatting root files..."
	@$(NODE_BIN)/eslint . --fix

# -----------------------------------------------------------------------------
## ▸ Testing
# -----------------------------------------------------------------------------

.PHONY: test
test: ## Run all unit tests
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Running tests..."
	@$(TURBO) run test $(TURBO_COLOR) $(TURBO_NO_DAEMON)

.PHONY: test-ui
test-ui: ## Run unit tests in UI mode
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Running tests in UI mode..."
	@$(TURBO) run test:ui $(TURBO_COLOR) $(TURBO_NO_DAEMON)

.PHONY: test-cov
test-cov: ## Run unit tests with coverage
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Running tests with coverage..."
	@$(TURBO) run test:cov $(TURBO_COLOR) $(TURBO_NO_DAEMON)

.PHONY: test-e2e-install
test-e2e-install: ## Install Playwright browsers
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Installing Playwright browsers..."
	@$(BUN) run --cwd $(PLAYWRIGHT_DIR) install:browsers
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Playwright browsers installed"

.PHONY: test-e2e
test-e2e: ## Run Playwright e2e tests
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Running e2e tests..."
	@$(TURBO) run test:e2e --filter=./packages/playwright $(TURBO_COLOR)

.PHONY: test-e2e-ui
test-e2e-ui: ## Run Playwright e2e tests in UI mode
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Running e2e tests in UI mode..."
	@$(TURBO) run test:e2e:ui --filter=./packages/playwright $(TURBO_COLOR)

# -----------------------------------------------------------------------------
## ▸ Docker - Development
# -----------------------------------------------------------------------------

.PHONY: docker-dev-build
docker-dev-build: ## Build dev Docker images
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Building dev images..."
	@export BUILDX_BAKE_ENTITLEMENTS_FS=0 && \
	export COMPOSE_FILE=$(COMPOSE_DEV) && \
	cd $$(dirname $$COMPOSE_FILE) && \
	docker buildx bake --file $$(basename $$COMPOSE_FILE) --load && \
	cd - > /dev/null
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Dev images built"

.PHONY: docker-dev
docker-dev: ## Start dev containers with watch mode
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Starting dev containers..."
	@$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) up -d && \
	$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) watch --no-up & \
	$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) attach api docs

.PHONY: docker-dev-clean
docker-dev-clean: ## Stop dev containers
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Stopping dev containers..."
	@$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) down
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Dev containers stopped"

.PHONY: docker-dev-delete
docker-dev-delete: ## Delete dev containers and volumes
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Deleting dev containers and volumes..."
	@$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) down -v
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Dev containers and volumes deleted"

.PHONY: docker-e2e
docker-e2e: ## Run e2e tests in dev containers
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Running e2e tests in Docker..."
	@$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) up -d && \
	$(BUN) run test:e2e; \
	EXIT_CODE=$$?; \
	$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) down; \
	exit $$EXIT_CODE

# -----------------------------------------------------------------------------
## ▸ Docker - Production
# -----------------------------------------------------------------------------

.PHONY: docker-prod-build
docker-prod-build: ## Build prod Docker images
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Building prod images..."
	@export BUILDX_BAKE_ENTITLEMENTS_FS=0 && \
	export COMPOSE_FILE=$(COMPOSE_PROD) && \
	cd $$(dirname $$COMPOSE_FILE) && \
	docker buildx bake --file $$(basename $$COMPOSE_FILE) --load && \
	cd - > /dev/null
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Prod images built"

.PHONY: docker-prod
docker-prod: ## Start prod containers
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Starting prod containers..."
	@$(DOCKER_COMPOSE) -f $(COMPOSE_PROD) up

.PHONY: docker-prod-clean
docker-prod-clean: ## Stop prod containers
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Stopping prod containers..."
	@$(DOCKER_COMPOSE) -f $(COMPOSE_PROD) down
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Prod containers stopped"

.PHONY: docker-prod-delete
docker-prod-delete: ## Delete prod containers and volumes
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Deleting prod containers and volumes..."
	@$(DOCKER_COMPOSE) -f $(COMPOSE_PROD) down -v
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Prod containers and volumes deleted"

.PHONY: docker-e2e-ci
docker-e2e-ci: ## Run e2e tests in prod containers (CI)
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Running e2e tests in prod Docker (CI)..."
	@$(DOCKER_COMPOSE) -f $(COMPOSE_PROD) up -d && \
	sleep 5 && \
	$(BUN) run test:e2e:ci --force; \
	EXIT_CODE=$$?; \
	$(DOCKER_COMPOSE) -f $(COMPOSE_PROD) down; \
	exit $$EXIT_CODE

# -----------------------------------------------------------------------------
## ▸ Kubernetes - Setup
# -----------------------------------------------------------------------------

.PHONY: kube-init
kube-init: ## Initialize local Kubernetes cluster with kind
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Initializing Kubernetes cluster..."
	@$(KIND_SCRIPT) -i -d $(KUBE_DOMAINS)
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Kubernetes cluster initialized"

.PHONY: kube-clean
kube-clean: ## Clean Kubernetes cluster
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Cleaning Kubernetes cluster..."
	@$(KIND_SCRIPT) -c clean
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Kubernetes cluster cleaned"

.PHONY: kube-delete
kube-delete: ## Delete Kubernetes cluster
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Deleting Kubernetes cluster..."
	@$(KIND_SCRIPT) -c delete
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Kubernetes cluster deleted"

# -----------------------------------------------------------------------------
## ▸ Kubernetes - Development
# -----------------------------------------------------------------------------

.PHONY: kube-dev-build
kube-dev-build: ## Build and load dev images into kind
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Building dev images for Kubernetes..."
	@$(KIND_SCRIPT) -c create,build -f $(COMPOSE_DEV)
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Dev images built for Kubernetes"

.PHONY: kube-dev-load
kube-dev-load: ## Load dev images into kind
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Loading dev images into kind..."
	@$(KIND_SCRIPT) -c create,load -f $(COMPOSE_DEV)
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Dev images loaded into kind"

.PHONY: kube-dev-run
kube-dev-run: ## Deploy dev environment to Kubernetes
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Deploying dev environment to Kubernetes..."
	@$(KIND_SCRIPT) -c create,dev
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Dev environment deployed"

.PHONY: kube-dev
kube-dev: kube-dev-build kube-dev-run ## Full dev workflow for Kubernetes

.PHONY: kube-e2e
kube-e2e: ## Run e2e tests in dev Kubernetes
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Running e2e tests in Kubernetes..."
	@TARGET_HOST=api.domain.local TARGET_PORT=80 $(MAKE) kube-dev && \
	$(BUN) run test:e2e

# -----------------------------------------------------------------------------
## ▸ Kubernetes - Production
# -----------------------------------------------------------------------------

.PHONY: kube-prod-build
kube-prod-build: ## Build and load prod images into kind
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Building prod images for Kubernetes..."
	@$(KIND_SCRIPT) -c create,build -f $(COMPOSE_PROD)
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Prod images built for Kubernetes"

.PHONY: kube-prod-load
kube-prod-load: ## Load prod images into kind
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Loading prod images into kind..."
	@$(KIND_SCRIPT) -c create,load -f $(COMPOSE_PROD)
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Prod images loaded into kind"

.PHONY: kube-prod-run
kube-prod-run: ## Deploy prod environment to Kubernetes
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Deploying prod environment to Kubernetes..."
	@$(KIND_SCRIPT) -c create,prod
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Prod environment deployed"

.PHONY: kube-prod
kube-prod: kube-prod-build kube-prod-run ## Full prod workflow for Kubernetes

.PHONY: kube-e2e-ui
kube-e2e-ui: ## Run e2e tests in prod Kubernetes (UI)
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Running e2e tests in Kubernetes (UI)..."
	@TARGET_HOST=api.domain.local TARGET_PORT=80 $(MAKE) kube-prod && \
	$(BUN) run test:e2e:ui

# -----------------------------------------------------------------------------
## ▸ CI/CD
# -----------------------------------------------------------------------------

.PHONY: ci
ci: lint test-cov test-e2e ## Run all checks and tests for CI
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) CI checks complete"
