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
BUN_VERSION="$(bun --version)"

# Default bun command
BUN_COMMAND="install"

# Declare script helper
TEXT_HELPER="\nThis script aims to install package.json dependencies for the whole git project with automatic detection.
Default installation method is 'npm $BUN_COMMAND'.
Following flags are available:
  -a    Install packages with additional args.

  -h    Print script help.\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts ha: flag
do
  case "${flag}" in
    a)
      BUN_COMMAND="${BUN_COMMAND} ${OPTARG}";;
    h | *)
      print_help
      exit 0;;
  esac
done

# Install packages
printf "\nScript settings:
  -> bun version: $BUN_VERSION
  -> bun command: $BUN_COMMAND\n"

cd "$PROJECT_DIR"

cp ./package.json package.json.tmp
cat package.json.tmp | jq 'del(.workspaces[] | select(. == "apps/*"))' > ./package.json

find ./apps -type f -name "package.json" -not -path "**/node_modules/*" -not -path "**/cache/*" \
  | awk '{ print substr( $0, 1, length($0)-13 ) }' \
  | while read d; do
    printf "\n\n${red}${i}.${no_color} Install nodejs packages for directory: ${red}$d${no_color}\n\n"
    cd "$d"
    bun "$BUN_COMMAND"
    rm -rf ./node_modules
    cd - > /dev/null
    i=$(($i + 1))
  done

mv -f ./package.json.tmp ./package.json