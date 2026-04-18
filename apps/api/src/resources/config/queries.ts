import type { AppConfig } from '@template-monorepo-ts/shared'
import type { JsonValue } from '~/utils/prisma.js'
import { AppConfigSchema } from '@template-monorepo-ts/shared'
import { getRedisClient } from '~/modules/auth/redis.js'
import { db } from '~/prisma/clients.js'
import { createCache } from '~/utils/cache.js'
import { config as serverConfig } from '~/utils/config.js'

const CONFIG_KEY = 'config'

/**
 * Default app config returned when nothing has been persisted yet.
 */
const defaultConfig: AppConfig = {
  enableRegistration: true,
  allowOrganizationCreation: true,
  appName: 'Template Monorepo TS',
  documentationUrl: '',
  maintenanceMode: false,
  maxOrganizationsPerUser: null,
}

// ---------------------------------------------------------------------------
// Redis-backed cache — shared across all replicas.
// Falls back to no-op when Redis is not configured (every call hits DB).
// ---------------------------------------------------------------------------
const configCache = createCache<AppConfig>(getRedisClient(), {
  prefix: 'app:config:',
  ttlSeconds: 300,
  schema: AppConfigSchema,
})

/** Evicts the cached config, forcing the next read to hit the database. */
export async function invalidateConfigCache(): Promise<void> {
  await configCache.del(CONFIG_KEY)
}

/** Reads the current app config (cache → DB → defaults). */
export async function getConfigQuery(): Promise<AppConfig> {
  const cached = await configCache.get(CONFIG_KEY)
  if (cached) return cached

  const row = await db.webSetting.findUnique({ where: { key: CONFIG_KEY } })
  const config = row ? (row.value as AppConfig) : defaultConfig

  await configCache.set(CONFIG_KEY, config)
  return config
}

/** Creates or updates the app config and refreshes the cache. */
export async function upsertConfigQuery(data: AppConfig): Promise<AppConfig> {
  const row = await db.webSetting.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value: data as unknown as JsonValue },
    update: { value: data as unknown as JsonValue },
  })
  const config = row.value as AppConfig

  // Immediately visible to ALL replicas
  await configCache.set(CONFIG_KEY, config)
  return config
}

/**
 * Returns the list of SSO providers available on this server instance.
 * Derived from the server's runtime configuration (not persisted).
 */
export function getSsoProviders(): string[] {
  const providers: string[] = []
  if (serverConfig.keycloak.enabled) {
    providers.push('keycloak')
  }
  return providers
}
