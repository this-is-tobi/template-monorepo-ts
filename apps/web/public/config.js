// Runtime configuration — placeholders are replaced at container startup
// by entrypoint.sh using envsubst. Empty values fall back to VITE_* env vars.
/* eslint-disable no-template-curly-in-string, style/semi */
// eslint-disable-next-line no-var
var __APP_CONFIG__ = {
  apiUrl: '${API_URL}',
};
// Attach to window for the application to read.
window.__APP_CONFIG__ = __APP_CONFIG__;
