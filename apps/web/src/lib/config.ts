/**
 * Runtime configuration injected by the Docker entrypoint.
 *
 * In production, `public/config.js` contains `${VAR}` placeholders that
 * `entrypoint.sh` replaces at container start using `envsubst`.
 *
 * In development, `VITE_*` env vars are used as fallback via `import.meta.env`.
 *
 * `apiUrl` should include the API base path when one is used
 * (e.g. `http://localhost:8081/api`). For a dedicated API domain
 * without a prefix, just use the origin (`https://api.example.com`).
 *
 * To add a new variable:
 *   1. Add a `VITE_*` env type in `env.d.ts` and a key here.
 *   2. Add a `${VAR}` placeholder in `public/config.js`.
 *   3. Add the variable to `ENVSUBST_VARS` in `entrypoint.sh`.
 */

interface RuntimeConfig {
  apiUrl: string
  appVersion: string
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<RuntimeConfig>
  }
}

const runtimeConfig = window.__APP_CONFIG__ ?? {}

function resolveValue(runtimeVal: string | undefined, envVal: string | undefined, fallback = ''): string {
  // In dev mode the raw placeholder (e.g. '${API_URL}') is served as-is.
  // In prod, envsubst writes the real value or empty string when unset.
  if (runtimeVal && !runtimeVal.startsWith('${')) {
    return runtimeVal
  }
  return envVal ?? fallback
}

export const config: RuntimeConfig = {
  apiUrl: resolveValue(runtimeConfig.apiUrl, import.meta.env.VITE_API_URL),
  appVersion: resolveValue(runtimeConfig.appVersion, import.meta.env.VITE_APP_VERSION, 'dev'),
}
