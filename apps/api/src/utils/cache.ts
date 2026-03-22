import type Redis from 'ioredis'

// ---------------------------------------------------------------------------
// Generic Redis cache — JSON-serialised key/value with TTL.
//
// When no Redis client is provided, a no-op implementation is returned so
// callers don't need conditional logic.  This preserves the
// "Redis-is-optional" design principle.
// ---------------------------------------------------------------------------

export interface CacheOptions {
  /** Key prefix (e.g. `"app:config:"`). */
  prefix: string
  /** TTL in seconds. */
  ttlSeconds: number
}

export interface Cache<T> {
  get: (key: string) => Promise<T | undefined>
  set: (key: string, value: T) => Promise<void>
  del: (key: string) => Promise<void>
}

/**
 * Create a Redis-backed cache with JSON serialization.
 *
 * When `redis` is `undefined` (no Redis configured), falls back to a
 * no-op cache — every `get` returns `undefined`, every `set`/`del` is
 * a no-op.
 */
export function createCache<T>(redis: InstanceType<typeof Redis> | undefined, opts: CacheOptions): Cache<T> {
  if (!redis) {
    return {
      get: async () => undefined,
      set: async () => {},
      del: async () => {},
    }
  }

  const fullKey = (key: string) => `${opts.prefix}${key}`

  return {
    async get(key: string): Promise<T | undefined> {
      const raw = await redis.get(fullKey(key))
      if (!raw) return undefined
      return JSON.parse(raw) as T
    },
    async set(key: string, value: T): Promise<void> {
      await redis.set(fullKey(key), JSON.stringify(value), 'EX', opts.ttlSeconds)
    },
    async del(key: string): Promise<void> {
      await redis.del(fullKey(key))
    },
  }
}
