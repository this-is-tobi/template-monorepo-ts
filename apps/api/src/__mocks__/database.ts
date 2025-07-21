import { vi } from 'vitest'

export const initDb = vi.fn().mockResolvedValue(undefined)
export const closeDb = vi.fn().mockResolvedValue(undefined)
export const DELAY_BEFORE_RETRY = 10
