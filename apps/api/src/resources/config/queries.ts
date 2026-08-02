import type { AppConfig } from '@template-monorepo-ts/shared'
import type { JsonValue } from '~/utils/prisma.js'
import { createLogger } from '@template-monorepo-ts/logger'
import { AppConfigSchema } from '@template-monorepo-ts/shared'
import { getRedisClient } from '~/modules/auth/redis.js'
import { db, dbRo } from '~/prisma/clients.js'
import { createCache } from '~/utils/cache.js'
import { config as serverConfig } from '~/utils/config.js'

const CONFIG_KEY = 'config'

const configLogger = createLogger({ name: 'app-config' })

/**
 * Default app config returned when nothing has been persisted yet.
 *
 * Derived from the schema rather than hand-written, so a newly added field
 * cannot be forgotten here and silently read back as `undefined`.
 */
const defaultConfig: AppConfig = AppConfigSchema.parse({})

/**
 * Coerce a persisted `web_setting` row into a complete `AppConfig`.
 *
 * The column is untyped JSON, so a row written before a field existed is
 * missing that key entirely. Parsing (rather than casting) fills in defaults
 * and drops anything unrecognised; an unparseable row falls back to defaults
 * instead of propagating `undefined` into behaviour like maintenance mode.
 */
function parseStoredConfig(value: unknown): AppConfig {
  const parsed = AppConfigSchema.safeParse(value)
  if (parsed.success) return parsed.data
  configLogger.warn({ issues: parsed.error.issues }, 'stored app config is invalid — falling back to defaults')
  return defaultConfig
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
  const dbConfig = row ? parseStoredConfig(row.value) : defaultConfig
  const config = applyLockedOverrides(dbConfig)

  await configCache.set(CONFIG_KEY, config)
  return config
}

/**
 * Creates or updates the app config and refreshes the cache.
 *
 * Locked fields are **not persisted**: their submitted values are whatever the
 * env/file layer forced into the form, so writing them would bake a copy of
 * the override into the database and leave that stale value behind the day the
 * env var is removed. The previously stored value is kept instead, so
 * unlocking a field restores what the platform admin last chose.
 */
export async function upsertConfigQuery(data: AppConfig): Promise<AppConfig> {
  const locked = new Set<string>(getLockedConfigFields())

  const existingRow = locked.size > 0
    ? await db.webSetting.findUnique({ where: { key: CONFIG_KEY } })
    : null
  const existing = existingRow ? parseStoredConfig(existingRow.value) : defaultConfig

  const toPersist = locked.size === 0
    ? data
    : { ...data, ...Object.fromEntries([...locked].map(key => [key, existing[key as keyof AppConfig]])) } as AppConfig

  const row = await db.webSetting.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value: toPersist as unknown as JsonValue },
    update: { value: toPersist as unknown as JsonValue },
  })
  const config = applyLockedOverrides(parseStoredConfig(row.value))

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

/**
 * Whether local email + password sign-in is available on this instance.
 *
 * Boot config, like {@link getSsoProviders} — the login page reads it to
 * decide whether to render a credentials form at all.
 */
export function isEmailPasswordEnabled(): boolean {
  return serverConfig.auth.emailPassword.enabled
}
