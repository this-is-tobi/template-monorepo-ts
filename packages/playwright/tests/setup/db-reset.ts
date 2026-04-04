import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const ROOT_DIR = resolve(import.meta.dirname, '../../../..')
const COMPOSE_FILE = 'docker/docker-compose.dev.yml'

function compose(service: string, command: string) {
  execSync(`docker compose -f ${COMPOSE_FILE} exec -T ${service} ${command}`, {
    cwd: ROOT_DIR,
    stdio: 'pipe',
  })
}

function composeCmd(command: string) {
  execSync(`docker compose -f ${COMPOSE_FILE} ${command}`, {
    cwd: ROOT_DIR,
    stdio: 'pipe',
  })
}

// All application tables (order respects FK constraints via CASCADE)
const TABLES = [
  'audit_log',
  'project_member',
  'project',
  'web_setting',
  'apikey',
  'invitation',
  'member',
  'organization_role',
  'organization',
  '"twoFactor"',
  'verification',
  'session',
  'account',
  'jwks',
  '"user"',
]

/**
 * Truncate all public tables except _prisma_migrations.
 * Uses docker exec → psql — no extra Node dependencies required.
 */
export function resetDatabase() {
  const sql = `TRUNCATE ${TABLES.join(', ')} CASCADE`
  compose('db', `psql -U admin -d template-monorepo-ts -c '${sql}'`)
}

/**
 * Flush Redis session storage to avoid stale sessions after DB reset.
 */
export function flushRedis() {
  compose('redis', 'redis-cli FLUSHDB')
}

/**
 * Restart the API container to re-trigger the admin user bootstrap.
 */
export function restartApi() {
  composeCmd('restart api')
}

/**
 * Wait for the API to be healthy after restart.
 */
export function waitForApi(timeoutMs = 30_000) {
  const apiHost = process.env.API_HOST || 'localhost'
  const apiPort = process.env.API_PORT || '8081'
  const url = `http://${apiHost}:${apiPort}/api/v1/healthz`
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    try {
      const result = execSync(`curl -sf ${url}`, { stdio: 'pipe', timeout: 3000 })
      if (result.toString().includes('OK')) return
    } catch { /* retry */ }
    execSync('sleep 1')
  }
  throw new Error(`API not healthy after ${timeoutMs}ms`)
}

/**
 * Full environment reset: DB truncate + Redis flush.
 */
export function resetAll() {
  resetDatabase()
  flushRedis()
}
