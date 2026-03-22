import type { AppConfig } from '@template-monorepo-ts/shared'
import type { JsonValue } from '~/utils/prisma.js'
import { db } from '~/prisma/clients.js'
import { config as serverConfig } from '~/utils/config.js'

const CONFIG_KEY = 'config'

/**
 * Default app config returned when nothing has been persisted yet.
 */
const defaultConfig: AppConfig = {
  enableRegistration: true,
}

// ---------------------------------------------------------------------------
// In-memory cache — avoids a DB round-trip on every auth request.
// TTL is short enough that admin changes propagate quickly, even across
// replicas (each process has its own cache).
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 30_000 // 30 seconds
let cachedConfig: AppConfig | null = null
let cacheExpiry = 0

export function invalidateConfigCache() {
  cachedConfig = null
  cacheExpiry = 0
}

export async function getConfigQuery(): Promise<AppConfig> {
  const now = Date.now()
  if (cachedConfig && now < cacheExpiry) {
    return cachedConfig
  }

  const row = await db.webSetting.findUnique({ where: { key: CONFIG_KEY } })
  const config = row ? (row.value as AppConfig) : defaultConfig

  cachedConfig = config
  cacheExpiry = now + CACHE_TTL_MS

  return config
}

export async function upsertConfigQuery(data: AppConfig): Promise<AppConfig> {
  const row = await db.webSetting.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value: data as unknown as JsonValue },
    update: { value: data as unknown as JsonValue },
  })
  const config = row.value as AppConfig

  // Refresh cache immediately so the change takes effect on this replica
  cachedConfig = config
  cacheExpiry = Date.now() + CACHE_TTL_MS

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
