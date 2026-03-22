import type { ThemeConfig } from '@template-monorepo-ts/shared'
import type { JsonValue } from '~/utils/prisma.js'
import { db } from '~/prisma/clients.js'

const THEME_KEY = 'theme'

/**
 * Default theme returned when nothing has been persisted yet.
 */
const defaultTheme: ThemeConfig = {
  primaryColor: 'zinc',
  surfaceColor: 'zinc',
}

export async function getThemeQuery(): Promise<ThemeConfig> {
  const row = await db.webSetting.findUnique({ where: { key: THEME_KEY } })
  if (!row) {
    return defaultTheme
  }
  return row.value as ThemeConfig
}

export async function upsertThemeQuery(data: ThemeConfig): Promise<ThemeConfig> {
  const row = await db.webSetting.upsert({
    where: { key: THEME_KEY },
    create: { key: THEME_KEY, value: data as unknown as JsonValue },
    update: { value: data as unknown as JsonValue },
  })
  return row.value as ThemeConfig
}
