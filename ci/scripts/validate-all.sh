#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track overall status
FAILED_STEPS=()

log_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

run_step() {
    local step_name="$1"
    local command="$2"

    log_step "$step_name"

    if eval "$command"; then
        log_success "$step_name completed successfully"
        return 0
    else
        log_error "$step_name failed"
        FAILED_STEPS+=("$step_name")
        return 1
    fi
}

# Parse arguments
SKIP_DOCKER=false
SKIP_TESTS=false
CLEAN_BUILD=false
NO_CACHE=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --no-cache)
            NO_CACHE=true
            CLEAN_BUILD=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-docker    Skip Docker build steps"
            echo "  --skip-tests     Skip test execution"
            echo "  --clean          Clean build artifacts before building"
            echo "  --no-cache       Run without any cache (Turbo, Docker) - forces clean build"
            echo "  --verbose, -v    Show detailed output"
            echo "  --help, -h       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          Template Monorepo - Full Validation Suite           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo "Project root: $PROJECT_ROOT"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"

# Clean build if requested
if [ "$CLEAN_BUILD" = true ]; then
    log_step "Cleaning build artifacts"
    rm -rf packages/shared/types packages/shared/dist packages/shared/tsconfig.build.tsbuildinfo
    rm -rf packages/test-utils/types packages/test-utils/dist packages/test-utils/tsconfig.tsbuildinfo
    rm -rf apps/api/types apps/api/dist apps/api/tsconfig.build.tsbuildinfo
    if [ "$NO_CACHE" = true ]; then
        rm -rf node_modules/.cache .turbo apps/*/.turbo packages/*/.turbo
        log_success "Clean completed (including cache)"
    else
        log_success "Clean completed"
    fi
fi

# Setup Turbo flags
TURBO_FORCE=""
if [ "$NO_CACHE" = true ]; then
    TURBO_FORCE="--force"
    log_warning "Running without cache (Turbo --force enabled)"
fi

# Step 1: Install dependencies
run_step "Installing dependencies" "bun install --frozen-lockfile" || true

# Step 2: Compile packages (TypeScript type generation)
if [ "$NO_CACHE" = true ]; then
    run_step "Compiling Packages" "bunx turbo run compile --color --force" || true
else
    run_step "Compiling Packages" "bun run compile" || true
fi

# Step 3: Build packages (bundling)
if [ "$NO_CACHE" = true ]; then
    run_step "Building Packages" "bunx turbo run build --color --no-daemon --force" || true
else
    run_step "Building Packages" "bun run build" || true
fi

# Check bundle size
if [ -f "./apps/api/dist/server.js" ]; then
    API_SIZE=$(du -h ./apps/api/dist/server.js | cut -f1)
    echo "  API bundle size: $API_SIZE"
fi

# Step 4: ESLint
run_step "ESLint Check" "bun run lint" || true

# Step 5: Unit Tests
if [ "$SKIP_TESTS" = false ]; then
    if [ "$NO_CACHE" = true ]; then
        run_step "Unit Tests" "bunx turbo run test --color --no-daemon --force" || true
    else
        run_step "Unit Tests" "bun run test" || true
    fi
else
    log_warning "Skipping tests (--skip-tests flag)"
fi

# Step 6: Docker builds
if [ "$SKIP_DOCKER" = false ]; then
    log_step "Docker Image Builds"

    # Setup Docker flags
    DOCKER_FLAGS=""
    if [ "$NO_CACHE" = true ]; then
        DOCKER_FLAGS="--no-cache"
        log_warning "Building Docker images without cache"
    fi

    echo "Building API Docker image..."
    if docker build $DOCKER_FLAGS -f ./apps/api/Dockerfile -t template-api:test --target prod . 2>&1; then
        log_success "API Docker build passed"

        # Check image size
        API_IMAGE_SIZE=$(docker images template-api:test --format "{{.Size}}")
        echo "  Image size: $API_IMAGE_SIZE"
    else
        log_error "API Docker build failed"
        FAILED_STEPS+=("Docker: API")
    fi

    echo "Building Docs Docker image..."
    if docker build $DOCKER_FLAGS -f ./apps/docs/Dockerfile -t template-docs:test --target prod . 2>&1; then
        log_success "Docs Docker build passed"

        # Check image size
        DOCS_IMAGE_SIZE=$(docker images template-docs:test --format "{{.Size}}")
        echo "  Image size: $DOCS_IMAGE_SIZE"
    else
        log_error "Docs Docker build failed"
        FAILED_STEPS+=("Docker: Docs")
    fi

    # Cleanup test images
    docker rmi template-api:test template-docs:test 2>/dev/null || true
else
    log_warning "Skipping Docker builds (--skip-docker flag)"
fi

# Summary
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}                     VALIDATION SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ ${#FAILED_STEPS[@]} -eq 0 ]; then
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    ALL CHECKS PASSED! ✓                      ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    exit 0
else
    echo -e "${RED}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    SOME CHECKS FAILED ✗                      ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo "Failed steps:"
    for step in "${FAILED_STEPS[@]}"; do
        echo -e "  ${RED}✗${NC} $step"
    done
    exit 1
fi
