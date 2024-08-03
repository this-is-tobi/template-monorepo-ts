#!/bin/bash

set -e

# Colorize terminal
red='\e[0;31m'
no_color='\033[0m'
# Console step increment
i=1

# Get project directories
PROJECT_DIR="$(git rev-parse --show-toplevel)"

# Declare script helper
TEXT_HELPER="\nThis script aims to copy example files into used files at project initialization.
Following flags are available:

  -h    Print script help\n\n"

print_help() {
  printf "$TEXT_HELPER"
}

# Parse options
while getopts h flag
do
  case "${flag}" in
    h | *)
      print_help
      exit 0;;
  esac
done


find $PROJECT_DIR -type f -name ".env*-example" -or -name "*-example.yaml" | while read f; do
  if [ ! -f "${f/-example/}" ]; then
    printf "\n${red}Copy${no_color}: '$f' 
    ${red}to${no_color}: '${f/-example/}'\n"
    cp "$f" "${f/-example/}"
  else
    printf "\nFile '${f/-example/}' already exists\n"
  fi
done
