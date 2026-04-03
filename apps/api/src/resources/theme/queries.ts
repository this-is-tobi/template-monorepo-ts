import type { ThemeConfig } from '@template-monorepo-ts/shared'
import type { JsonValue } from '~/utils/prisma.js'
import { getRedisClient } from '~/modules/auth/redis.js'
import { db } from '~/prisma/clients.js'
import { createCache } from '~/utils/cache.js'
import { config as serverConfig } from '~/utils/config.js'

const THEME_KEY = 'theme'

/**
 * Default theme returned when nothing has been persisted yet.
 */
const defaultTheme: ThemeConfig = {
  primaryColor: 'zinc',
  surfaceColor: 'zinc',
}

// ---------------------------------------------------------------------------
// Redis-backed cache — shared across all replicas.
// Falls back to no-op when Redis is not configured (every call hits DB).
// ---------------------------------------------------------------------------
const themeCache = createCache<ThemeConfig>(getRedisClient(serverConfig.auth), {
  prefix: 'app:theme:',
  ttlSeconds: 30,
})

/** Evicts the cached theme, forcing the next read to hit the database. */
export async function invalidateThemeCache(): Promise<void> {
  await themeCache.del(THEME_KEY)
}

/** Reads the current theme config (cache → DB → defaults). */
export async function getThemeQuery(): Promise<ThemeConfig> {
  const cached = await themeCache.get(THEME_KEY)
  if (cached) return cached

  const row = await db.webSetting.findUnique({ where: { key: THEME_KEY } })
  const theme = row ? (row.value as ThemeConfig) : defaultTheme

  await themeCache.set(THEME_KEY, theme)
  return theme
}

/** Creates or updates the theme config and refreshes the cache. */
export async function upsertThemeQuery(data: ThemeConfig): Promise<ThemeConfig> {
  const row = await db.webSetting.upsert({
    where: { key: THEME_KEY },
    create: { key: THEME_KEY, value: data as unknown as JsonValue },
    update: { value: data as unknown as JsonValue },
  })
  const theme = row.value as ThemeConfig

  // Immediately visible to ALL replicas
  await themeCache.set(THEME_KEY, theme)
  return theme
}
