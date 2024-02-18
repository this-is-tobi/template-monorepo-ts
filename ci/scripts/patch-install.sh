#!/bin/bash

find ./apps ./packages -type f -name "package.json" -not -path "**/node_modules/*" -not -path "**/cache/*" \
  | awk '{ print substr( $0, 1, length($0)-13 ) }' \
  | while read dir; do
    if [ "$(cat $dir/package.json | jq '. | has("devDependencies")')" == "true" ]; then
      bun remove --cwd $dir $(cat $dir/package.json | jq -rc '.devDependencies | keys | join(" ")')
    fi
  done
