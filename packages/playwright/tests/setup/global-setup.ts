import { flushRedis, resetDatabase, restartApi, waitForApi } from './db-reset.js'

/**
 * Playwright globalSetup — runs once before all test suites.
 *
 * 1. Truncate all DB tables (clean slate)
 * 2. Flush Redis (remove stale sessions)
 * 3. Restart the API container (re-triggers admin bootstrap)
 * 4. Wait until the API is healthy
 */
export default async function globalSetup() {
  console.log('\n🔄 Resetting database...')
  resetDatabase()

  console.log('🔄 Flushing Redis...')
  flushRedis()

  console.log('🔄 Restarting API (triggers admin bootstrap)...')
  restartApi()

  console.log('⏳ Waiting for API to be healthy...')
  waitForApi()

  console.log('✅ E2E setup complete\n')
}
