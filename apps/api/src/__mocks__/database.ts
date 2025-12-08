export const initDb = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
export const closeDb = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
export const DELAY_BEFORE_RETRY = 10
