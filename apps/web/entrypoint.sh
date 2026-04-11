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

NGINX_CONF=/etc/nginx/conf.d/default.conf

# Inject API_URL into CSP connect-src when set, otherwise remove the placeholder.
if [ -n "$API_URL" ]; then
  sed -i "s|__CONNECT_SRC_EXTRA__|${API_URL}|g" "$NGINX_CONF"
else
  sed -i "s| __CONNECT_SRC_EXTRA__||g" "$NGINX_CONF"
fi

echo "Done."
