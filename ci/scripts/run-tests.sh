#!/bin/bash

set -e

# Colorize terminal
red='\e[0;31m'
no_color='\033[0m'
# Console step increment
i=1

# Get project directories
PROJECT_DIR="$(git rev-parse --show-toplevel)"

# Get versions
NODE_VERSION="$(node --version)"
NPM_VERSION="$(npm --version)"
DOCKER_VERSION="$(docker --version)"
DOCKER_BUILDX_VERSION="$(docker buildx version)"

# Default
RUN_LINT="false"
RUN_UNIT_TESTS="false"
RUN_COMPONENT_TESTS="false"
RUN_E2E_TESTS="false"
RUN_STATUS_CHECK="false"
TAG="dev"
E2E_TESTS_ARGS="--spec 'src/e2e/specs/**/*.e2e.ts'"

# Declare script helper
TEXT_HELPER="\nThis script aims to run application tests.
Following flags are available:

  -c    Run component tests.

  -e    Run e2e tests with given args.
        Default is '$E2E_TESTS_ARGS', which means tests all applications.

  -l    Run lint over codebase.

  -s    Run deployement status check.

  -t    Tag used for docker images in e2e tests.
        Default is '$TAG'.

  -u    Run unit tests.
  
  -h    Print script help\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

getopts_get_optional_argument() {
  eval next_token=\${$OPTIND}
  if [[ -n $next_token && ! $next_token =~ '^-{1}[a-zA-Z]{1}$' ]]; then
    OPTIND=$((OPTIND + 1))
    OPTARG=$next_token
  else
    OPTARG=""
  fi
}

# Parse options
while getopts hcelst:u flag
do
  case "${flag}" in
    c)
      RUN_COMPONENT_TESTS=true;;
    e)
      getopts_get_optional_argument $@
      E2E_TESTS_ARGS="${OPTARG:-$E2E_TESTS_ARGS}"
      RUN_E2E_TESTS=true;;
    l)
      RUN_LINT=true;;
    s)
      RUN_STATUS_CHECK=true;;
    t)
      TAG=${OPTARG};;
    u)
      RUN_UNIT_TESTS=true;;
    h | *)
      print_help
      exit 0;;
  esac
done


# Script condition
if [ "$RUN_LINT" == "false" ] && [ "$RUN_UNIT_TESTS" == "false" ] && [ "$RUN_E2E_TESTS" == "false" ] && [ "$RUN_COMPONENT_TESTS" == "false" ] && [ "$RUN_STATUS_CHECK" == "false" ]; then
  printf "\nArgument(s) missing, you don't specify any kind of test to run.\n"
  print_help
  exit 1
fi

checkDockerRunning () {
  if [ ! -x "$(command -v docker)" ]; then
    printf "\nThis script uses docker, and it isn't running - please start docker and try again!\n"
    exit 1
  fi
}

checkBuildxPlugin () {
  if [ ! "$DOCKER_BUILDX_VERSION" ]; then
    printf "\nThis script uses docker buildx plugin, and it isn't installed - please install docker buildx plugin and try again!\n"
    exit 1
  fi
}


# Settings
printf "\nScript settings:
  -> node version: ${NODE_VERSION}
  -> npm version: ${NPM_VERSION}
  -> docker version: ${DOCKER_VERSION}
  -> docker buildx version: ${DOCKER_BUILDX_VERSION}
  -> run unit tests: ${RUN_UNIT_TESTS}
  -> run component tests: ${RUN_COMPONENT_TESTS}
  -> run e2e tests: ${RUN_E2E_TESTS}
  -> run deploy status check: ${RUN_STATUS_CHECK}\n"


# Functions
run_lint () {
  printf "\n${red}${i}.${no_color} Launch codebase lint\n"
  i=$(($i + 1))

  npm run lint -- --cache-dir=.turbo/cache --log-order=stream
}

run_unit_tests () {
  printf "\n${red}${i}.${no_color} Launch unit tests\n"
  i=$(($i + 1))

  npm run test:cov -- --cache-dir=.turbo/cache --log-order=stream
}

run_component_tests () {
  checkDockerRunning

  printf "\n${red}${i}.${no_color} Launch component tests\n"
  i=$(($i + 1))

  npm run test:ct-ci -- --cache-dir=.turbo/cache --log-order=stream
}

run_e2e_tests () {
  checkDockerRunning
  
  printf "\n${red}${i}.${no_color} Launch e2e tests\n"
  i=$(($i + 1))

  npm run build
  npm run kube:init
  npm run kube:prod -- -t $TAG
  npm run test:e2e-ci -- --cache-dir=.turbo/cache --log-order=stream -- $E2E_TESTS_ARGS

  printf "\n${red}${i}.${no_color} Remove kubernetes resources\n"
  i=$(($i + 1))

  npm run kube:delete
}

run_deploy_check () {
  checkDockerRunning
  
  printf "\n${red}${i}.${no_color} Launch e2e tests\n"
  i=$(($i + 1))

  npm run kube:init
  npm run kube:prod -- -t $TAG
  for pod in $(kubectl get pod | tail --lines=+2 | awk '{print $1}'); do
    printf "\nPod: ${pod}\n${red}Status:${no_color} $(kubectl get pod/${pod} -o jsonpath='{.status.phase}')\n"
  done

  printf "\n${red}${i}.${no_color} Remove kubernetes resources\n"
  i=$(($i + 1))

  npm run kube:delete
}


# Go to root dir
cd "$PROJECT_DIR"


# Run lint
[ "$RUN_LINT" == "true" ] && run_lint

# Run unit tests
[ "$RUN_UNIT_TESTS" == "true" ] && run_unit_tests

# Run component tests
[ "$RUN_COMPONENT_TESTS" == "true" ] && run_component_tests

# Run e2e tests
[ "$RUN_E2E_TESTS" == "true" ] && run_e2e_tests

# Run deployment status check
[ "$RUN_STATUS_CHECK" == "true" ] && run_deploy_check
