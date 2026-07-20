import type { BetterAuthOptions } from 'better-auth'
import { redisStorage } from '@better-auth/redis-storage'
import { createLogger } from '@template-monorepo-ts/logger'
import Redis from 'ioredis'
import { config } from '~/utils/config.js'

const redisLogger = createLogger({ name: 'redis' })

// ---------------------------------------------------------------------------
// Redis factory — builds the ioredis client used by BetterAuth secondary
// storage.  Extracted from auth.ts for testability (no betterAuth bootstrap).
//
// Three modes (by priority):
//  1. Sentinel  — `redisSentinelUrls` is set → HA failover, mandatory `name`
//  2. Standalone — `redisUrl` is set → single node / Cluster-mode proxy
//  3. None       — returns undefined, BetterAuth falls back to Prisma (DB)
//
// NOTE: In sentinel mode, `redisPassword` authenticates to Redis nodes and
//       `redisSentinelPassword` authenticates to Sentinel nodes (falls back to
//       `redisPassword` when not set, covering the common single-password case).
//       For standalone the password can alternatively be embedded in the URL.
// ---------------------------------------------------------------------------

/** Parsed sentinel entry: host + port pair. */
interface SentinelEntry {
  host: string
  port: number
}

/** Subset of the auth.redis config consumed by this module. */
export interface RedisAuthConfig {
  url: string
  sentinelUrls: string
  sentinelMaster: string
  /** Password for Redis nodes (standalone and sentinel `password` field). */
  password: string
  /**
   * Password for Sentinel nodes (`sentinelPassword` field).
   * Falls back to `password` when not set, covering the common case where
   * both Redis nodes and Sentinels share the same password.
   */
  sentinelPassword: string
}

/**
 * Parse a comma-separated `"host:port,host:port"` string into sentinel entries.
 * Falls back to port 26379 when the port part is missing or non-numeric.
 */
export function parseSentinelUrls(raw: string): SentinelEntry[] {
  return raw.split(',').map((entry) => {
    const trimmed = entry.trim()
    const colonIdx = trimmed.lastIndexOf(':')
    if (colonIdx <= 0) {
      return { host: trimmed, port: 26379 }
    }
    const host = trimmed.slice(0, colonIdx)
    const port = Number(trimmed.slice(colonIdx + 1))
    return { host, port: Number.isFinite(port) && port > 0 ? port : 26379 }
  })
}

/**
 * Build an ioredis client for the given auth configuration.
 *
 * Returns `undefined` when neither `redisUrl` nor `redisSentinelUrls` is set.
 */
export function buildRedisClient(authConfig: RedisAuthConfig): InstanceType<typeof Redis> | undefined {
  const { url, sentinelUrls, sentinelMaster, password, sentinelPassword } = authConfig
  // In sentinel mode, the node password and sentinel password may differ.
  // Use the dedicated sentinel password when available, fall back to the shared one.
  const resolvedSentinelPassword = sentinelPassword || password

  if (sentinelUrls) {
    // Sentinel mode — ioredis requires an object constructor, not a URL string.
    return primeConnection(withErrorHandler(new Redis({
      sentinels: parseSentinelUrls(sentinelUrls),
      name: sentinelMaster,
      ...(password ? { password } : {}),
      ...(resolvedSentinelPassword ? { sentinelPassword: resolvedSentinelPassword } : {}),
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      enableReadyCheck: true,
    }), 'sentinel'))
  }

  if (!url) {
    return undefined
  }

  // Standalone mode — password can be embedded in the URL or supplied separately.
  return primeConnection(withErrorHandler(new Redis(url, {
    ...(password ? { password } : {}),
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  }), 'standalone'))
}

/**
 * Start connecting immediately.  Clients are created with `lazyConnect: true`
 * so that importing this module never opens a socket implicitly (tests, CLI
 * scripts), but at runtime we want the connection established before the
 * first request — with `enableOfflineQueue: false`, commands issued while the
 * socket is still connecting fail instead of queueing.  Connection errors are
 * reported through the throttled `error` listener, not here.
 */
function primeConnection(client: InstanceType<typeof Redis>): InstanceType<typeof Redis> {
  if (typeof client.connect === 'function') {
    client.connect().catch(() => { /* surfaced via the 'error' listener */ })
  }
  return client
}

/**
 * Attach a throttled `error` listener so an unreachable Redis reconnects
 * quietly in the background instead of spamming "[ioredis] Unhandled
 * error event" for every failed attempt. `enableOfflineQueue: false` +
 * `maxRetriesPerRequest: 1` above make commands fail fast (callers treat
 * failures as cache misses) rather than stalling requests for seconds.
 */
function withErrorHandler(client: InstanceType<typeof Redis>, label: string): InstanceType<typeof Redis> {
  let lastLoggedAt = 0
  if (typeof client.on === 'function') {
    client.on('error', (err: Error) => {
      const now = Date.now()
      if (now - lastLoggedAt > 30_000) {
        lastLoggedAt = now
        redisLogger.warn(
          { err: err.message },
          `redis (${label}) unreachable — retrying in background, further errors suppressed for 30s`,
        )
      }
    })
  }
  return client
}

/**
 * Key prefix shared by the base adapter and the atomic extensions below.
 * Passed explicitly to `redisStorage` so both stay in the same keyspace.
 */
const STORAGE_KEY_PREFIX = 'better-auth:'

/**
 * Atomic INCR with TTL-on-creation, matching BetterAuth's `increment`
 * contract: the counter is created at 1 with the given TTL (seconds) and
 * later increments never extend it, so it expires a fixed window after
 * creation.  The TTL<0 branch heals counters left without expiry (e.g. a
 * crash between INCR and EXPIRE is impossible in Lua, but keys written by
 * older code or manual tinkering are).
 */
const INCREMENT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
elseif redis.call('TTL', KEYS[1]) < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
`

/**
 * Build the BetterAuth secondary storage adapter for the given auth config.
 * Returns `undefined` when no Redis is configured (sessions persisted in DB).
 *
 * The adapter is wrapped so a Redis outage degrades to DB-backed behaviour
 * (get → miss, set/delete → no-op with a warning, rate-limit counters fail
 * open) instead of turning every authenticated request into a 500.
 *
 * On top of the base get/set/delete it implements BetterAuth's optional
 * atomic extensions:
 *  - `increment`    — Lua INCR+EXPIRE, gives the rate limiter an atomic
 *                     `consume` (strict enforcement under concurrency)
 *  - `getAndDelete` — GETDEL, closes the read-then-delete race on
 *                     single-use credentials
 */
export function buildSecondaryStorage(
  authConfig: RedisAuthConfig,
): BetterAuthOptions['secondaryStorage'] | undefined {
  const client = buildRedisClient(authConfig)
  if (!client) return undefined

  const storage = redisStorage({ client, keyPrefix: STORAGE_KEY_PREFIX }) as NonNullable<BetterAuthOptions['secondaryStorage']>

  return {
    async get(key) {
      try {
        return await storage.get(key)
      } catch (err) {
        redisLogger.warn({ err: err instanceof Error ? err.message : String(err), key }, 'secondary storage get failed — treating as miss')
        return null
      }
    },
    async set(key, value, ttl) {
      try {
        await storage.set(key, value, ttl)
      } catch (err) {
        redisLogger.warn({ err: err instanceof Error ? err.message : String(err), key }, 'secondary storage set failed — skipping')
      }
    },
    async delete(key) {
      try {
        await storage.delete(key)
      } catch (err) {
        redisLogger.warn({ err: err instanceof Error ? err.message : String(err), key }, 'secondary storage delete failed — skipping')
      }
    },
    async getAndDelete(key) {
      try {
        return await client.getdel(`${STORAGE_KEY_PREFIX}${key}`)
      } catch (err) {
        redisLogger.warn({ err: err instanceof Error ? err.message : String(err), key }, 'secondary storage getAndDelete failed — treating as miss')
        return null
      }
    },
    async increment(key, ttl) {
      try {
        return await client.eval(INCREMENT_SCRIPT, 1, `${STORAGE_KEY_PREFIX}${key}`, ttl) as number
      } catch (err) {
        // Fail open: report "first hit" so the request is allowed — Redis
        // being down should degrade rate limiting, not availability.
        redisLogger.warn({ err: err instanceof Error ? err.message : String(err), key }, 'secondary storage increment failed — failing open')
        return 1
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Shared Redis client — application-wide cache (config, theme, etc.)
//
// Lazily instantiated on first call and reused. Returns `undefined` when
// no Redis is configured, so callers MUST handle the absence (the
// `createCache` utility in `utils/cache.ts` already does this).
// ---------------------------------------------------------------------------

let sharedClient: InstanceType<typeof Redis> | undefined

/**
 * Returns a shared ioredis client for application-level caching.
 *
 * The client is lazily created on first call from the global `config.auth.redis`.
 * Returns `undefined` when Redis is not configured — callers should
 * gracefully degrade (e.g. skip caching).
 *
 * Note: the client is a process-wide singleton intentionally (Redis config
 * is global).  Tests that need a different client must reset the module
 * state via `vi.resetModules()`.
 */
export function getRedisClient(): InstanceType<typeof Redis> | undefined {
  if (sharedClient) return sharedClient
  sharedClient = buildRedisClient(config.auth.redis)
  return sharedClient
}
