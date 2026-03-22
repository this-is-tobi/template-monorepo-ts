/**
 * Base path prepended to all versioned API routes.
 *
 * Defaults to `''` (no prefix). The API server overrides this at startup
 * via {@link setApiBasePath} (e.g. `'/api'` → routes at `/api/v1/…`).
 *
 * Web consumers do NOT need to call `setApiBasePath` — they embed the
 * base path directly in `apiUrl` (e.g. `http://localhost:8081/api`).
 */
let _apiBasePath = ''

/**
 * Override the API base-path prefix at runtime.
 *
 * Called by the **API server** at startup so that shared route paths
 * include the configured prefix (e.g. `/api/v1/projects`).
 *
 * @example
 * setApiBasePath('/api')  // → apiPrefix.v1 === '/api/v1'
 */
export function setApiBasePath(base: string) {
  _apiBasePath = base
}

/**
 * API path prefixes — derived from the current base-path.
 *
 * The `v1` property is a getter so it always reflects the latest value
 * set via {@link setApiBasePath}.
 */
export const apiPrefix: { readonly v1: string } = {
  get v1() { return `${_apiBasePath}/v1` },
}
