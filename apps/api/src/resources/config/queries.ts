import type { AppConfig } from '@template-monorepo-ts/shared'
import type { JsonValue } from '~/utils/prisma.js'
import { AppConfigSchema } from '@template-monorepo-ts/shared'
import { getRedisClient } from '~/modules/auth/redis.js'
import { db, dbRo } from '~/prisma/clients.js'
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
  maxProjectsPerOrg: null,
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

/**
 * Returns the AppConfig field names that are locked by server-level overrides
 * (env vars with `APP_CONFIG__*` prefix or the `appConfig` section in the
 * config file). Locked fields cannot be changed via the admin UI.
 */
export function getLockedConfigFields(): (keyof AppConfig)[] {
  const overrides = serverConfig.platform
  if (!overrides) return []
  return (Object.keys(AppConfigSchema.shape) as (keyof AppConfig)[])
    .filter(k => overrides[k] !== undefined)
}

/**
 * Merges locked field values on top of a base config, so env/file overrides
 * always take precedence over DB-stored values.
 */
function applyLockedOverrides(base: AppConfig): AppConfig {
  const lockedFields = getLockedConfigFields()
  if (lockedFields.length === 0) return base
  const overrides = serverConfig.platform!
  return {
    ...base,
    ...Object.fromEntries(lockedFields.map(k => [k, overrides[k]])),
  } as AppConfig
}

/** Reads the current app config (cache → DB → defaults), with locked overrides applied. */
export async function getConfigQuery(): Promise<AppConfig> {
  const cached = await configCache.get(CONFIG_KEY)
  if (cached) return cached

  const row = await dbRo.webSetting.findUnique({ where: { key: CONFIG_KEY } })
  const dbConfig = row ? (row.value as AppConfig) : defaultConfig
  const config = applyLockedOverrides(dbConfig)

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
  const storedConfig = row.value as AppConfig
  const config = applyLockedOverrides(storedConfig)

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
  if (serverConfig.oidc.enabled) {
    providers.push('keycloak')
  }
  return providers
}
