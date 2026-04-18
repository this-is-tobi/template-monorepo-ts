import type { Logger } from '@template-monorepo-ts/logger'
import type Redis from 'ioredis'
import type { ZodType } from 'zod'
import { createLogger } from '@template-monorepo-ts/logger'

// ---------------------------------------------------------------------------
// Generic Redis cache — JSON-serialised key/value with TTL.
//
// When no Redis client is provided, a no-op implementation is returned so
// callers don't need conditional logic.  This preserves the
// "Redis-is-optional" design principle.
// ---------------------------------------------------------------------------

export interface CacheOptions<T = unknown> {
  /** Key prefix (e.g. `"app:config:"`). */
  prefix: string
  /** TTL in seconds. */
  ttlSeconds: number
  /** Optional logger — defaults to a `cache` named logger. */
  logger?: Logger
  /**
   * Optional Zod schema used to validate the cached payload after JSON parsing.
   *
   * Strongly recommended whenever the cache may outlive a deploy that changed
   * the cached type — without validation, a poisoned key (left over from a
   * previous version with a different shape) would propagate untyped data
   * to consumers.  When validation fails, the entry is treated as a miss and
   * deleted to self-heal.
   */
  schema?: ZodType<T>
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
export function createCache<T>(redis: InstanceType<typeof Redis> | undefined, opts: CacheOptions<T>): Cache<T> {
  if (!redis) {
    return {
      get: async () => undefined,
      set: async () => {},
      del: async () => {},
    }
  }

  return buildRedisCache<T>(redis, opts)
}

// ---------------------------------------------------------------------------
// Redis-backed store with in-memory fallback.
//
// Unlike `createCache`, this always stores data — even without Redis.
// When Redis is absent, an in-memory Map is used with a size cap to
// prevent unbounded growth.  Useful for short-lived bridging state that
// must survive at least within a single replica.
// ---------------------------------------------------------------------------

export interface StoreOptions<T = unknown> extends CacheOptions<T> {
  /** Maximum entries in the in-memory fallback map (default: 1000). */
  maxMemoryEntries?: number
}

/**
 * Create a store that uses Redis when available, otherwise falls back to
 * an in-memory Map with size-based eviction.
 *
 * Designed for short-lived bridging state (e.g. pending org memberships
 * during OIDC sign-up) that must work across replicas when Redis is
 * configured, and degrade gracefully to single-replica when it is not.
 *
 * Note: the in-memory fallback evicts entries in FIFO order (oldest
 * inserted first), NOT LRU. This is acceptable for short-lived bridging
 * state but not suitable for general-purpose caching.
 */
export function createStore<T>(redis: InstanceType<typeof Redis> | undefined, opts: StoreOptions<T>): Cache<T> {
  if (redis) {
    return buildRedisCache<T>(redis, opts)
  }

  const map = new Map<string, T>()
  const maxEntries = opts.maxMemoryEntries ?? 1_000

  return {
    async get(key: string): Promise<T | undefined> {
      return map.get(key)
    },
    async set(key: string, value: T): Promise<void> {
      if (map.size >= maxEntries) {
        const firstKey = map.keys().next().value as string
        map.delete(firstKey)
      }
      map.set(key, value)
    },
    async del(key: string): Promise<void> {
      map.delete(key)
    },
  }
}

// ---------------------------------------------------------------------------
// Shared Redis implementation used by both createCache and createStore.
// ---------------------------------------------------------------------------

function buildRedisCache<T>(redis: InstanceType<typeof Redis>, opts: CacheOptions<T>): Cache<T> {
  const fullKey = (key: string) => `${opts.prefix}${key}`
  const log = opts.logger ?? createLogger({ name: 'cache' })

  return {
    async get(key: string): Promise<T | undefined> {
      try {
        const raw = await redis.get(fullKey(key))
        if (!raw) return undefined
        const parsed: unknown = JSON.parse(raw)
        if (opts.schema) {
          const result = opts.schema.safeParse(parsed)
          if (!result.success) {
            log.warn(
              { prefix: opts.prefix, key, issues: result.error.issues },
              'cache get returned data that failed schema validation — evicting',
            )
            // Self-heal: drop the poisoned entry so the next caller refreshes it.
            await redis.del(fullKey(key)).catch(() => {})
            return undefined
          }
          return result.data
        }
        return parsed as T
      } catch (err) {
        log.warn({ err, prefix: opts.prefix, key }, 'cache get failed')
        return undefined
      }
    },
    async set(key: string, value: T): Promise<void> {
      try {
        await redis.set(fullKey(key), JSON.stringify(value), 'EX', opts.ttlSeconds)
      } catch (err) {
        log.warn({ err, prefix: opts.prefix, key }, 'cache set failed')
      }
    },
    async del(key: string): Promise<void> {
      try {
        await redis.del(fullKey(key))
      } catch (err) {
        log.warn({ err, prefix: opts.prefix, key }, 'cache del failed')
      }
    },
  }
}
