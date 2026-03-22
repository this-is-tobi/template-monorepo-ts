/**
 * Environment variables for Playwright tests.
 * @property {string} apiHost - Host for the API service (default: 'localhost')
 * @property {string} apiPort - Port for the API service (default: '8081')
 * @property {string} docsHost - Host for the Docs service (default: 'localhost')
 * @property {string} docsPort - Port for the Docs service (default: '8082')
 * @property {string} webHost - Host for the Web service (default: 'localhost')
 * @property {string} webPort - Port for the Web service (default: '8080')
 * @property {string} testUserEmail - Email for the default test user
 * @property {string} testUserPassword - Password for the default test user
 * @property {string} testAdminEmail - Email for the admin test user
 * @property {string} testAdminPassword - Password for the admin test user
 */
export const env = {
  apiHost: process.env.API_HOST || 'localhost',
  apiPort: process.env.API_PORT || '8081',
  docsHost: process.env.DOCS_HOST || 'localhost',
  docsPort: process.env.DOCS_PORT || '8082',
  webHost: process.env.WEB_HOST || 'localhost',
  webPort: process.env.WEB_PORT || '8080',
  testUserEmail: process.env.TEST_USER_EMAIL || 'admin@example.com',
  testUserPassword: process.env.TEST_USER_PASSWORD || 'admin',
  testAdminEmail: process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
  testAdminPassword: process.env.TEST_ADMIN_PASSWORD || 'admin',
}
