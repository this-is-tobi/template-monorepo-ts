#!/bin/sh
set -e

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

echo "Computing CSP hash for config.js"

# Compute SHA-256 hash of config.js for the Content-Security-Policy header.
# This replaces the __CONFIG_JS_HASH__ placeholder in nginx.conf so that
# the inline script can execute without 'unsafe-inline'.
CONFIG_HASH=$(sha256sum "$CONFIG_FILE" | awk '{print $1}' | xxd -r -p | base64 -w0)
NGINX_CONF=/etc/nginx/conf.d/default.conf
sed -i "s|__CONFIG_JS_HASH__|'sha256-${CONFIG_HASH}'|g" "$NGINX_CONF"

echo "Done."
