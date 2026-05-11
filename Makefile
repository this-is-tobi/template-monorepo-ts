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
PROJECT_ROOT   := $(shell pwd)
NODE_BIN       := $(PROJECT_ROOT)/node_modules/.bin
API_DIR        := $(PROJECT_ROOT)/apps/api
PLAYWRIGHT_DIR := $(PROJECT_ROOT)/packages/playwright
K6_DIR         := $(PROJECT_ROOT)/packages/k6

# Docker compose files
DOCKER_DIR       := $(PROJECT_ROOT)/docker
COMPOSE_DEV      := $(DOCKER_DIR)/docker-compose.dev.yml
COMPOSE_PROD     := $(DOCKER_DIR)/docker-compose.prod.yml

# Kubernetes
KIND_SCRIPT      := $(PROJECT_ROOT)/ci/kind/run.sh
KUBE_DOMAINS     := domain.local,api.domain.local,docs.domain.local,web.domain.local,grafana.domain.local
KUBE_CONTEXT     := kind-kind
KUBE_RELEASE     := template
KUBE_FULLNAME    := template-template-monorepo-ts

# Runtime
BUN              := bun
TURBO            := $(BUN) run turbo
DOCKER_COMPOSE   := docker compose

# Turbo flags
TURBO_COLOR      := --color

# Service URLs for e2e readiness checks
API_URL           := http://localhost:8081
WEB_URL           := http://localhost:8080
E2E_WAIT_TIMEOUT  := 120
E2E_WAIT_INTERVAL := 2

# k6 → OTel collector endpoint (host networking; collector exposes 4318)
K6_OTEL_ENDPOINT  := localhost:4318

# Kubernetes perf: API exposed via ingress, OTel via port-forward
KUBE_API_URL            := http://api.domain.local
KUBE_OTEL_LOCAL_PORT    := 4318
KUBE_PF_PIDS_FILE       := /tmp/k6-kube-portforward.pids

# Shell snippet: poll a URL until it responds (args: url, label, timeout, interval)
define _wait_for_url
	URL="$(1)"; LABEL="$(2)"; TIMEOUT="$(3)"; INTERVAL="$(4)"; \
	ELAPSED=0; \
	echo "$(COLOR_DIM)  Waiting for $$LABEL ($$URL)...$(COLOR_RESET)"; \
	while [ "$$ELAPSED" -lt "$$TIMEOUT" ]; do \
		if curl -sf -o /dev/null "$$URL" 2>/dev/null; then \
			echo "$(COLOR_GREEN)✓$(COLOR_RESET) $$LABEL is ready"; \
			break; \
		fi; \
		sleep "$$INTERVAL"; \
		ELAPSED=$$((ELAPSED + INTERVAL)); \
	done; \
	if [ "$$ELAPSED" -ge "$$TIMEOUT" ]; then \
		echo "$(COLOR_RED)✗$(COLOR_RESET) Timed out waiting for $$LABEL"; \
		exit 1; \
	fi
endef

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
	@echo "$(COLOR_BOLD)$(COLOR_CYAN)  Template Monorepo TypeScript - Available Commands$(COLOR_RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} \
		/^## / { printf "\n$(COLOR_BOLD)$(COLOR_YELLOW)%s$(COLOR_RESET)\n", substr($$0, 4) } \
		/^[a-zA-Z0-9_-]+:.*##/ { printf "  $(COLOR_CYAN)%-28s$(COLOR_RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""

# -----------------------------------------------------------------------------
## ▸ Setup & Tools
# -----------------------------------------------------------------------------

.PHONY: init
init: ## Full setup: install, compile, build, db generate, docker dev build
	@echo ""
	@echo "$(COLOR_BOLD)$(COLOR_CYAN)  Full project setup$(COLOR_RESET)"
	@echo ""
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) [1/6] Installing dependencies..."
	@$(BUN) install
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Dependencies installed"
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) [2/6] Generating Prisma client..."
	@$(BUN) run --cwd $(API_DIR) db:generate
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Prisma client generated"
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) [3/6] Compiling TypeScript..."
	@$(TURBO) run compile $(TURBO_COLOR)
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Compilation complete"
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) [4/6] Building packages and apps..."
	@$(TURBO) run build $(TURBO_COLOR)
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Build complete"
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) [5/6] Installing git hooks..."
	@PATH="$(NODE_BIN):$$PATH" husky
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Git hooks installed"
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) [6/6] Building dev Docker images..."
	@export BUILDX_BAKE_ENTITLEMENTS_FS=0 && \
	export COMPOSE_FILE=$(COMPOSE_DEV) && \
	cd $$(dirname $$COMPOSE_FILE) && \
	docker buildx bake --file $$(basename $$COMPOSE_FILE) --load && \
	cd - > /dev/null
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Dev Docker images built"
	@echo ""
	@echo "$(COLOR_BOLD)$(COLOR_GREEN)  ✓ Setup complete$(COLOR_RESET)"
	@echo "$(COLOR_DIM)  Run 'make docker-dev-up' to start the development environment$(COLOR_RESET)"
	@echo ""

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
	@$(TURBO) run build $(TURBO_COLOR)
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
	@$(BUN) run --cwd $(API_DIR) db:deploy
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Migrations deployed"

.PHONY: db-migrate
db-migrate: ## Run Prisma migrations in dev mode
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Running database migrations..."
	@$(BUN) run --cwd $(API_DIR) db:migrate
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Migrations applied"

.PHONY: db-reset
db-reset: ## Reset database and run migrations
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Resetting database..."
	@$(BUN) run --cwd $(API_DIR) db:reset
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Database reset complete"

.PHONY: db-check
db-check: ## Check for schema drift between database and Prisma schema
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Checking database schema drift..."
	@$(BUN) run --cwd $(API_DIR) db:check
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Database schema is in sync"

.PHONY: db-auth-generate
db-auth-generate: ## Generate BetterAuth schema (reconcile with multi-file Prisma layout)
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Generating BetterAuth schema..."
	@$(BUN) run --cwd $(API_DIR) db:auth:generate
	@# BetterAuth CLI bug: generates lowercase relations (twofactors, organizationroles)
	@# instead of camelCase. Remove duplicates to avoid Prisma validation errors.
	@# See: https://github.com/better-auth/better-auth/issues/XXXX
	@sed -i '' '/^[[:space:]]*twofactors[[:space:]]*TwoFactor\[\]/d' $(API_DIR)/prisma/auth.prisma
	@sed -i '' '/^[[:space:]]*organizationroles[[:space:]]*OrganizationRole\[\]/d' $(API_DIR)/prisma/auth.prisma
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Removed duplicate lowercase relations (CLI bug workaround)"
	@echo "$(COLOR_YELLOW)⚠$(COLOR_RESET) Review changes in prisma/*.prisma and reconcile with the multi-file layout"

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
	@$(TURBO) run test $(TURBO_COLOR)

.PHONY: validate
validate: ## Run full validation suite (lint, tests, builds) - uses cache
	@bash $(PROJECT_ROOT)/ci/scripts/validate-all.sh

.PHONY: validate-full
validate-full: ## Run full validation suite from scratch without any cache
	@bash $(PROJECT_ROOT)/ci/scripts/validate-all.sh --no-cache

.PHONY: test-ui
test-ui: ## Run unit tests in UI mode
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Running tests in UI mode..."
	@$(TURBO) run test:ui $(TURBO_COLOR)

.PHONY: test-cov
test-cov: ## Run unit tests with coverage
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Running tests with coverage..."
	@$(TURBO) run test:cov $(TURBO_COLOR)

.PHONY: test-e2e-install
test-e2e-install: ## Install Playwright browsers
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Installing Playwright browsers..."
	@$(BUN) run --cwd $(PLAYWRIGHT_DIR) install:browsers
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Playwright browsers installed"

.PHONY: test-e2e
test-e2e: ## Run Playwright e2e tests — Chromium only (auto-manages dev stack)
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Building dependencies..."
	@$(TURBO) run build --filter=@template-monorepo-ts/shared --filter=@template-monorepo-ts/test-utils $(TURBO_COLOR)
	@STACK_WAS_RUNNING=0; \
	if [ -n "$$($(DOCKER_COMPOSE) -f $(COMPOSE_DEV) ps -q 2>/dev/null)" ]; then \
		STACK_WAS_RUNNING=1; \
		echo "$(COLOR_DIM)  Dev stack already running — reusing containers$(COLOR_RESET)"; \
	else \
		echo "$(COLOR_BLUE)→$(COLOR_RESET) Starting dev stack..."; \
		$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) up -d --wait; \
	fi; \
	$(call _wait_for_url,$(API_URL)/api/v1/healthz,API,$(E2E_WAIT_TIMEOUT),$(E2E_WAIT_INTERVAL)); \
	$(call _wait_for_url,$(WEB_URL),Web,$(E2E_WAIT_TIMEOUT),$(E2E_WAIT_INTERVAL)); \
	echo "$(COLOR_BLUE)→$(COLOR_RESET) Running e2e tests (Chromium)..."; \
	$(BUN) run --cwd $(PLAYWRIGHT_DIR) test:e2e; EXIT_CODE=$$?; \
	if [ "$$STACK_WAS_RUNNING" = "0" ]; then \
		echo "$(COLOR_BLUE)→$(COLOR_RESET) Stopping dev stack..."; \
		$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) down; \
		echo "$(COLOR_GREEN)✓$(COLOR_RESET) Dev stack stopped"; \
	else \
		echo "$(COLOR_DIM)  Leaving existing stack running$(COLOR_RESET)"; \
	fi; \
	exit $$EXIT_CODE

.PHONY: test-e2e-full
test-e2e-full: ## Run Playwright e2e tests — all browsers (auto-manages dev stack)
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Building dependencies..."
	@$(TURBO) run build --filter=@template-monorepo-ts/shared --filter=@template-monorepo-ts/test-utils $(TURBO_COLOR)
	@STACK_WAS_RUNNING=0; \
	if [ -n "$$($(DOCKER_COMPOSE) -f $(COMPOSE_DEV) ps -q 2>/dev/null)" ]; then \
		STACK_WAS_RUNNING=1; \
		echo "$(COLOR_DIM)  Dev stack already running — reusing containers$(COLOR_RESET)"; \
	else \
		echo "$(COLOR_BLUE)→$(COLOR_RESET) Starting dev stack..."; \
		$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) up -d --wait; \
	fi; \
	$(call _wait_for_url,$(API_URL)/api/v1/healthz,API,$(E2E_WAIT_TIMEOUT),$(E2E_WAIT_INTERVAL)); \
	$(call _wait_for_url,$(WEB_URL),Web,$(E2E_WAIT_TIMEOUT),$(E2E_WAIT_INTERVAL)); \
	echo "$(COLOR_BLUE)→$(COLOR_RESET) Running e2e tests (all browsers)..."; \
	$(BUN) run --cwd $(PLAYWRIGHT_DIR) test:e2e:full; EXIT_CODE=$$?; \
	if [ "$$STACK_WAS_RUNNING" = "0" ]; then \
		echo "$(COLOR_BLUE)→$(COLOR_RESET) Stopping dev stack..."; \
		$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) down; \
		echo "$(COLOR_GREEN)✓$(COLOR_RESET) Dev stack stopped"; \
	else \
		echo "$(COLOR_DIM)  Leaving existing stack running$(COLOR_RESET)"; \
	fi; \
	exit $$EXIT_CODE

.PHONY: test-e2e-ui
test-e2e-ui: ## Run Playwright e2e tests in UI mode (auto-manages dev stack)
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Building dependencies..."
	@$(TURBO) run build --filter=@template-monorepo-ts/shared --filter=@template-monorepo-ts/test-utils $(TURBO_COLOR)
	@STACK_WAS_RUNNING=0; \
	if [ -n "$$($(DOCKER_COMPOSE) -f $(COMPOSE_DEV) ps -q 2>/dev/null)" ]; then \
		STACK_WAS_RUNNING=1; \
		echo "$(COLOR_DIM)  Dev stack already running — reusing containers$(COLOR_RESET)"; \
	else \
		echo "$(COLOR_BLUE)→$(COLOR_RESET) Starting dev stack..."; \
		$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) up -d --wait; \
	fi; \
	$(call _wait_for_url,$(API_URL)/api/v1/healthz,API,$(E2E_WAIT_TIMEOUT),$(E2E_WAIT_INTERVAL)); \
	$(call _wait_for_url,$(WEB_URL),Web,$(E2E_WAIT_TIMEOUT),$(E2E_WAIT_INTERVAL)); \
	echo "$(COLOR_BLUE)→$(COLOR_RESET) Running e2e tests in UI mode..."; \
	$(BUN) run --cwd $(PLAYWRIGHT_DIR) test:e2e:ui; EXIT_CODE=$$?; \
	if [ "$$STACK_WAS_RUNNING" = "0" ]; then \
		echo "$(COLOR_BLUE)→$(COLOR_RESET) Stopping dev stack..."; \
		$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) down; \
		echo "$(COLOR_GREEN)✓$(COLOR_RESET) Dev stack stopped"; \
	else \
		echo "$(COLOR_DIM)  Leaving existing stack running$(COLOR_RESET)"; \
	fi; \
	exit $$EXIT_CODE

# -----------------------------------------------------------------------------
## ▸ Performance tests (k6)
# -----------------------------------------------------------------------------

# Helper: run a k6 scenario, auto-managing the dev stack just like test-e2e.
# Set OTEL=1 to also stream metrics to the OTel collector → Prometheus → Grafana
# (dashboard: http://localhost:3000/d/k6-performance/k6-performance).
# Set SKIP_SEED=1 to skip the population seed step (useful when you know the
# users are already present from a previous run).
define _run_perf
	@command -v k6 >/dev/null 2>&1 || { \
		echo "$(COLOR_RED)✗$(COLOR_RESET) k6 is not installed."; \
		echo "  Install: https://k6.io/docs/getting-started/installation/"; \
		exit 1; \
	}
	@STACK_WAS_RUNNING=0; \
	if [ -n "$$($(DOCKER_COMPOSE) -f $(COMPOSE_DEV) ps -q 2>/dev/null)" ]; then \
		STACK_WAS_RUNNING=1; \
		echo "$(COLOR_DIM)  Dev stack already running — reusing containers$(COLOR_RESET)"; \
	else \
		echo "$(COLOR_BLUE)→$(COLOR_RESET) Starting dev stack..."; \
		$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) up -d --wait; \
	fi; \
	$(call _wait_for_url,$(API_URL)/api/v1/healthz,API,$(E2E_WAIT_TIMEOUT),$(E2E_WAIT_INTERVAL)); \
	if [ "$(1)" != "smoke" ] && [ "$${SKIP_SEED:-0}" != "1" ]; then \
		echo "$(COLOR_BLUE)→$(COLOR_RESET) Seeding k6 user population..."; \
		$(BUN) run --cwd $(API_DIR) db:seed-perf >/dev/null; \
		echo "$(COLOR_GREEN)✓$(COLOR_RESET) Population seeded"; \
	fi; \
	K6_OUT=""; \
	if [ "$${OTEL:-1}" = "1" ]; then \
		K6_OUT="--out opentelemetry"; \
		echo "$(COLOR_BLUE)→$(COLOR_RESET) Streaming metrics to OTLP $(K6_OTEL_ENDPOINT)"; \
		echo "$(COLOR_DIM)  Grafana dashboard: http://localhost:3000/d/k6-performance/k6-performance$(COLOR_RESET)"; \
	fi; \
	echo "$(COLOR_BLUE)→$(COLOR_RESET) Running k6 scenario: $(1)..."; \
	K6_BASE_URL=$(API_URL) \
	K6_OTEL_METRIC_PREFIX=k6_ \
	K6_OTEL_EXPORTER_TYPE=http \
	K6_OTEL_HTTP_EXPORTER_INSECURE=true \
	K6_OTEL_HTTP_EXPORTER_ENDPOINT=$(K6_OTEL_ENDPOINT) \
	K6_OTEL_HTTP_EXPORTER_URL_PATH=/v1/metrics \
	k6 run $$K6_OUT $(K6_DIR)/scenarios/$(1).js; EXIT_CODE=$$?; \
	if [ "$$STACK_WAS_RUNNING" = "0" ]; then \
		echo "$(COLOR_BLUE)→$(COLOR_RESET) Stopping dev stack..."; \
		$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) down; \
	else \
		echo "$(COLOR_DIM)  Leaving existing stack running$(COLOR_RESET)"; \
	fi; \
	exit $$EXIT_CODE
endef

.PHONY: test-perf-seed
test-perf-seed: ## Seed the k6 user population (idempotent — safe to re-run)
	@STACK_WAS_RUNNING=0; \
	if [ -n "$$($(DOCKER_COMPOSE) -f $(COMPOSE_DEV) ps -q 2>/dev/null)" ]; then \
		STACK_WAS_RUNNING=1; \
	else \
		echo "$(COLOR_BLUE)→$(COLOR_RESET) Starting dev stack..."; \
		$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) up -d --wait; \
	fi; \
	$(call _wait_for_url,$(API_URL)/api/v1/healthz,API,$(E2E_WAIT_TIMEOUT),$(E2E_WAIT_INTERVAL)); \
	echo "$(COLOR_BLUE)→$(COLOR_RESET) Seeding k6 user population..."; \
	$(BUN) run --cwd $(API_DIR) db:seed-perf; \
	echo "$(COLOR_GREEN)✓$(COLOR_RESET) Population seeded"; \
	if [ "$$STACK_WAS_RUNNING" = "0" ]; then \
		$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) down; \
	fi

.PHONY: test-perf-smoke
test-perf-smoke: ## Run k6 smoke perf scenario (auto-manages dev stack)
	$(call _run_perf,smoke)

.PHONY: test-perf-load
test-perf-load: ## Run k6 load perf scenario (auto-manages dev stack)
	$(call _run_perf,load)

.PHONY: test-perf-stress
test-perf-stress: ## Run k6 stress perf scenario (auto-manages dev stack)
	$(call _run_perf,stress)

.PHONY: test-perf-spike
test-perf-spike: ## Run k6 spike perf scenario (auto-manages dev stack)
	$(call _run_perf,spike)

.PHONY: test-perf-realistic
test-perf-realistic: ## Run k6 realistic mixed-traffic scenario (weighted journeys, auth seeded)
	$(call _run_perf,realistic)

.PHONY: test-perf-soak
test-perf-soak: ## Run k6 soak / endurance scenario (default 1h — set K6_DURATION to override)
	$(call _run_perf,soak)

.PHONY: test-perf-breakpoint
test-perf-breakpoint: ## Run k6 breakpoint / capacity-discovery scenario (open-model, abort on SLO)
	$(call _run_perf,breakpoint)

# -----------------------------------------------------------------------------
## ▸ Performance tests — Kubernetes (k6 → Kind cluster)
# -----------------------------------------------------------------------------

# Helper: run a k6 scenario against a Kind Kubernetes cluster.
# The cluster must be deployed first (kube-dev or kube-prod).
# Requests go through the Traefik ingress at api.domain.local:80.
# When OTEL=1, a port-forward exposes the in-cluster OTel collector
# so k6 can push metrics to the same Prometheus + Grafana stack
# (dashboard: http://grafana.domain.local/d/k6-performance/k6-performance).
#
# Default targets the prod deployment (HPA, HA Postgres, Sentinel) for a realistic
# simulation. Set KUBE_DEV=1 to target the dev deployment instead.
define _run_perf_kube
	@command -v k6 >/dev/null 2>&1 || { \
		echo "$(COLOR_RED)✗$(COLOR_RESET) k6 is not installed."; \
		echo "  Install: https://k6.io/docs/getting-started/installation/"; \
		exit 1; \
	}
	@command -v kubectl >/dev/null 2>&1 || { \
		echo "$(COLOR_RED)✗$(COLOR_RESET) kubectl is not installed."; \
		exit 1; \
	}
	@CLUSTER_WAS_RUNNING=0; \
	DEPLOY_TARGET="kube-prod"; \
	RUN_TARGET="kube-prod-run"; \
	if [ "$${KUBE_DEV:-0}" = "1" ]; then DEPLOY_TARGET="kube-dev"; RUN_TARGET="kube-dev-run"; fi; \
	if kubectl --context $(KUBE_CONTEXT) cluster-info >/dev/null 2>&1; then \
		if kubectl --context $(KUBE_CONTEXT) get deploy $(KUBE_FULLNAME)-api >/dev/null 2>&1; then \
			CLUSTER_WAS_RUNNING=1; \
			echo "$(COLOR_BLUE)→$(COLOR_RESET) Kind cluster running — re-applying $$RUN_TARGET values..."; \
			$(MAKE) $$RUN_TARGET || exit 1; \
		else \
			echo "$(COLOR_BLUE)→$(COLOR_RESET) Kind cluster exists but app not deployed — deploying $$DEPLOY_TARGET..."; \
			$(MAKE) $$DEPLOY_TARGET || exit 1; \
		fi; \
	else \
		echo "$(COLOR_BLUE)→$(COLOR_RESET) Starting Kind cluster and deploying $$DEPLOY_TARGET..."; \
		$(MAKE) $$DEPLOY_TARGET || exit 1; \
	fi; \
	kubectl --context $(KUBE_CONTEXT) rollout status deploy/$(KUBE_FULLNAME)-api --timeout=120s; \
	$(call _wait_for_url,$(KUBE_API_URL)/api/v1/healthz,Kube API,$(E2E_WAIT_TIMEOUT),$(E2E_WAIT_INTERVAL)); \
	if [ "$(1)" != "smoke" ] && [ "$${SKIP_SEED:-0}" != "1" ]; then \
		echo "$(COLOR_BLUE)→$(COLOR_RESET) Seeding k6 user population via HTTP..."; \
		K6_BASE_URL=$(KUBE_API_URL) k6 run $(K6_DIR)/scenarios/seed.js --quiet; \
		echo "$(COLOR_GREEN)✓$(COLOR_RESET) Population seeded"; \
	fi; \
	PF_PIDS=""; \
	K6_OUT=""; \
	if [ "$${OTEL:-1}" = "1" ]; then \
		K6_OUT="--out opentelemetry"; \
		echo "$(COLOR_BLUE)→$(COLOR_RESET) Port-forwarding OTel collector for k6 metrics..."; \
		kubectl --context $(KUBE_CONTEXT) port-forward svc/opentelemetry-collector $(KUBE_OTEL_LOCAL_PORT):4318 >/dev/null 2>&1 & \
		PF_PIDS="$$!"; \
		sleep 1; \
		echo "$(COLOR_DIM)  Grafana dashboard: http://grafana.domain.local/d/k6-performance/k6-performance$(COLOR_RESET)"; \
	fi; \
	echo "$(COLOR_BLUE)→$(COLOR_RESET) Running k6 scenario: $(1) (target: Kind cluster)..."; \
	K6_BASE_URL=$(KUBE_API_URL) \
	K6_OTEL_METRIC_PREFIX=k6_ \
	K6_OTEL_EXPORTER_TYPE=http \
	K6_OTEL_HTTP_EXPORTER_INSECURE=true \
	K6_OTEL_HTTP_EXPORTER_ENDPOINT=localhost:$(KUBE_OTEL_LOCAL_PORT) \
	K6_OTEL_HTTP_EXPORTER_URL_PATH=/v1/metrics \
	k6 run $$K6_OUT $(K6_DIR)/scenarios/$(1).js; EXIT_CODE=$$?; \
	if [ -n "$$PF_PIDS" ]; then \
		echo "$(COLOR_DIM)  Stopping port-forwards...$(COLOR_RESET)"; \
		kill $$PF_PIDS 2>/dev/null || true; \
	fi; \
	echo "$(COLOR_DIM)  Leaving Kind cluster running$(COLOR_RESET)"; \
	exit $$EXIT_CODE
endef

.PHONY: kube-perf-seed
kube-perf-seed: ## Seed the k6 user population in Kind cluster via HTTP (idempotent)
	@kubectl --context $(KUBE_CONTEXT) rollout status deploy/$(KUBE_FULLNAME)-api --timeout=120s
	@$(call _wait_for_url,$(KUBE_API_URL)/api/v1/healthz,Kube API,$(E2E_WAIT_TIMEOUT),$(E2E_WAIT_INTERVAL))
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Seeding k6 user population via HTTP..."
	@K6_BASE_URL=$(KUBE_API_URL) k6 run $(K6_DIR)/scenarios/seed.js --quiet
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Population seeded"

.PHONY: kube-perf-smoke
kube-perf-smoke: ## Run k6 smoke perf scenario against Kind cluster
	$(call _run_perf_kube,smoke)

.PHONY: kube-perf-load
kube-perf-load: ## Run k6 load perf scenario against Kind cluster
	$(call _run_perf_kube,load)

.PHONY: kube-perf-stress
kube-perf-stress: ## Run k6 stress perf scenario against Kind cluster
	$(call _run_perf_kube,stress)

.PHONY: kube-perf-spike
kube-perf-spike: ## Run k6 spike perf scenario against Kind cluster
	$(call _run_perf_kube,spike)

.PHONY: kube-perf-realistic
kube-perf-realistic: ## Run k6 realistic mixed-traffic scenario against Kind cluster
	$(call _run_perf_kube,realistic)

.PHONY: kube-perf-soak
kube-perf-soak: ## Run k6 soak / endurance scenario against Kind cluster (default 1h)
	$(call _run_perf_kube,soak)

.PHONY: kube-perf-breakpoint
kube-perf-breakpoint: ## Run k6 breakpoint / capacity-discovery scenario against Kind cluster
	$(call _run_perf_kube,breakpoint)

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

.PHONY: docker-dev-up
docker-dev-up: ## Start dev containers with watch mode
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Starting dev containers..."
	@$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) up --watch --attach api --attach web

.PHONY: docker-dev-down
docker-dev-down: ## Stop dev containers
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Stopping dev containers..."
	@$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) down
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Dev containers stopped"

.PHONY: docker-dev-clean
docker-dev-clean: ## Delete dev containers and volumes
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Deleting dev containers and volumes..."
	@$(DOCKER_COMPOSE) -f $(COMPOSE_DEV) down -v
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Dev containers and volumes deleted"

.PHONY: docker-e2e
docker-e2e: docker-dev-build test-e2e ## Build dev images then run e2e tests

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

.PHONY: docker-prod-up
docker-prod-up: ## Start prod containers
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Starting prod containers..."
	@$(DOCKER_COMPOSE) -f $(COMPOSE_PROD) up

.PHONY: docker-prod-down
docker-prod-down: ## Stop prod containers
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Stopping prod containers..."
	@$(DOCKER_COMPOSE) -f $(COMPOSE_PROD) down
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Prod containers stopped"

.PHONY: docker-prod-clean
docker-prod-clean: ## Delete prod containers and volumes
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Deleting prod containers and volumes..."
	@$(DOCKER_COMPOSE) -f $(COMPOSE_PROD) down -v
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Prod containers and volumes deleted"

.PHONY: docker-e2e-ci
docker-e2e-ci: ## Run e2e tests in prod containers (auto-manages stack lifecycle)
	@STACK_WAS_RUNNING=0; \
	if [ -n "$$($(DOCKER_COMPOSE) -f $(COMPOSE_PROD) ps -q 2>/dev/null)" ]; then \
		STACK_WAS_RUNNING=1; \
		echo "$(COLOR_DIM)  Prod stack already running — reusing containers$(COLOR_RESET)"; \
	else \
		echo "$(COLOR_BLUE)→$(COLOR_RESET) Starting prod stack..."; \
		$(DOCKER_COMPOSE) -f $(COMPOSE_PROD) up -d --wait; \
	fi; \
	$(call _wait_for_url,$(API_URL)/api/v1/healthz,API,$(E2E_WAIT_TIMEOUT),$(E2E_WAIT_INTERVAL)); \
	$(call _wait_for_url,$(WEB_URL),Web,$(E2E_WAIT_TIMEOUT),$(E2E_WAIT_INTERVAL)); \
	echo "$(COLOR_BLUE)→$(COLOR_RESET) Running e2e tests (all browsers)..."; \
	$(BUN) run test:e2e:full --force; EXIT_CODE=$$?; \
	if [ "$$STACK_WAS_RUNNING" = "0" ]; then \
		echo "$(COLOR_BLUE)→$(COLOR_RESET) Stopping prod stack..."; \
		$(DOCKER_COMPOSE) -f $(COMPOSE_PROD) down; \
		echo "$(COLOR_GREEN)✓$(COLOR_RESET) Prod stack stopped"; \
	else \
		echo "$(COLOR_DIM)  Leaving existing stack running$(COLOR_RESET)"; \
	fi; \
	exit $$EXIT_CODE

# -----------------------------------------------------------------------------
## ▸ Kubernetes - Setup
# -----------------------------------------------------------------------------

.PHONY: kube-init
kube-init: ## Initialize local Kubernetes cluster with kind
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Initializing Kubernetes cluster..."
	@$(KIND_SCRIPT) -i -d $(KUBE_DOMAINS)
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Kubernetes cluster initialized"

.PHONY: kube-down
kube-down: ## Remove Kubernetes application resources
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Removing Kubernetes application resources..."
	@$(KIND_SCRIPT) -c down
	@echo "$(COLOR_GREEN)✓$(COLOR_RESET) Kubernetes application resources removed"

.PHONY: kube-clean
kube-clean: ## Delete Kubernetes cluster
	@echo "$(COLOR_BLUE)→$(COLOR_RESET) Deleting Kubernetes cluster..."
	@$(KIND_SCRIPT) -c clean
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
