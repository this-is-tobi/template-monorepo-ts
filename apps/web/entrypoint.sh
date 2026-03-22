#!/bin/sh

# Runtime environment injection for the web application.
#
# This script runs at container startup (before nginx) and replaces
# ${VAR} placeholders in config.js with real environment variable values
# using envsubst. Empty values fall back to VITE_* env vars at runtime.
#
# To add a new variable:
#   1. Add a ${VAR_NAME} placeholder in public/config.js
#   2. Add the variable name to the ENVSUBST_VARS list below
#   3. Set the env var when running the container

CONFIG_FILE=/usr/share/nginx/html/config.js

echo "Injecting runtime configuration into config.js"

# List only the variables to substitute (prevents leaking other env vars).
ENVSUBST_VARS='${API_URL} ${APP_VERSION}'

envsubst "$ENVSUBST_VARS" < "$CONFIG_FILE" > "${CONFIG_FILE}.tmp" \
  && mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"

echo "Done."
