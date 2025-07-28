/**
 * Environment variables for Playwright tests.
 * @property {string} apiHost - Host for the API service (default: 'localhost')
 * @property {string} apiPort - Port for the API service (default: '8081')
 * @property {string} docsHost - Host for the Docs service (default: 'localhost')
 * @property {string} docsPort - Port for the Docs service (default: '8082')
 */
export const env = {
  apiHost: process.env.API_HOST || 'localhost',
  apiPort: process.env.API_PORT || '8081',
  docsHost: process.env.API_HOST || 'localhost',
  docsPort: process.env.API_PORT || '8082',
}
