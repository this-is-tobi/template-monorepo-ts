#!/bin/bash

set -e

# Colorize terminal
red='\033[0;31m'
green='\033[0;32m'
yellow='\033[0;33m'
cyan='\033[0;36m'
no_color='\033[0m'

# Get project directories
PROJECT_DIR="$(git rev-parse --show-toplevel)"

# Declare script helper
TEXT_HELPER="\nInitialize local configuration: copy every '*-example' file to its
real counterpart, generate a random AUTH__SECRET, and report drift between
existing files and their examples (stale or missing keys).

Following flags are available:

  -f    Force refresh: overwrite existing files with their example
        (a timestamped .bak copy of the old file is kept)

  -h    Print script help\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

FORCE=false

# Parse options
while getopts fh flag; do
  case "${flag}" in
    f)
      FORCE=true;;
    h | *)
      print_help
      exit 0;;
  esac
done

# Shared secret for this run — the same value is injected into every copied
# file so local and docker environments validate each other's sessions.
SECRET_PLACEHOLDER="change-me-in-production-use-256-bit-random"
if command -v openssl > /dev/null 2>&1; then
  GENERATED_SECRET="$(openssl rand -hex 32)"
else
  GENERATED_SECRET=""
fi

# List KEY= names of an env-style file (ignores comments and blank lines).
env_keys() {
  grep -E '^[A-Za-z0-9_]+=' "$1" 2> /dev/null | cut -d= -f1 | sort -u
}

copy_example() {
  local example="$1"
  local target="$2"
  cp "$example" "$target"
  # Replace the placeholder secret with a generated one on fresh copies.
  if [ -n "$GENERATED_SECRET" ] && grep -q "$SECRET_PLACEHOLDER" "$target" 2> /dev/null; then
    sed "s/$SECRET_PLACEHOLDER/$GENERATED_SECRET/" "$target" > "$target.tmp" && mv "$target.tmp" "$target"
    printf "        ${cyan}generated AUTH__SECRET${no_color}\n"
  fi
}

printf "\n${cyan}Syncing example files...${no_color}\n"

find "$PROJECT_DIR" -type f \( -name ".env*-example" -or -name "*-example.yaml" \) -not -path "*/node_modules/*" | sort | while read -r f; do
  target="${f/-example/}"
  rel_example="${f#"$PROJECT_DIR"/}"
  rel_target="${target#"$PROJECT_DIR"/}"

  if [ ! -f "$target" ]; then
    printf "\n${green}create${no_color}: $rel_target ${no_color}(from $rel_example)\n"
    copy_example "$f" "$target"
    continue
  fi

  if [ "$FORCE" = "true" ]; then
    backup="$target.$(date +%Y%m%d%H%M%S).bak"
    printf "\n${yellow}refresh${no_color}: $rel_target ${no_color}(backup: ${backup#"$PROJECT_DIR"/})\n"
    cp "$target" "$backup"
    copy_example "$f" "$target"
    continue
  fi

  printf "\n${no_color}keep${no_color}: $rel_target already exists\n"

  # Doctor: compare key names between the real file and its example so
  # renamed options (e.g. AUTH__REDIS_URL → AUTH__REDIS__URL) surface here
  # instead of being silently ignored at runtime.
  case "$f" in
    *.env*-example)
      stale="$(comm -23 <(env_keys "$target") <(env_keys "$f"))"
      missing="$(comm -13 <(env_keys "$target") <(env_keys "$f"))"
      if [ -n "$stale" ]; then
        printf "        ${red}stale keys${no_color} (not in $rel_example — renamed or removed?):\n"
        printf '%s\n' "$stale" | sed 's/^/          - /'
      fi
      if [ -n "$missing" ]; then
        printf "        ${yellow}missing keys${no_color} (in $rel_example but not in your file):\n"
        printf '%s\n' "$missing" | sed 's/^/          - /'
      fi
      if [ -n "$stale" ] || [ -n "$missing" ]; then
        printf "        ${cyan}hint${no_color}: run '$(basename "$0") -f' to refresh from examples (keeps a .bak)\n"
      fi;;
  esac
done

printf "\n${green}Done.${no_color}\n"
