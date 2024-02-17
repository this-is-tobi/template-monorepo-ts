export const env = {
  // default baseUrl
  defaultHost: process.env.DEFAULT_HOST ?? (() => env.apiHost),
  defaultPort: process.env.DEFAULT_PORT ?? (() => env.apiPort),
  // api baseUrl
  apiHost: process.env.API_HOST ?? 'localhost',
  apiPort: process.env.API_PORT ?? '8081',
  // docs baseUrl
  docsHost: process.env.DOCS_HOST ?? 'localhost',
  docsPort: process.env.DOCS_PORT ?? '8082',
}
