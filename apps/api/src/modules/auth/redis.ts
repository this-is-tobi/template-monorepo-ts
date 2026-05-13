import type { BetterAuthOptions } from 'better-auth'
import { redisStorage } from '@better-auth/redis-storage'
import Redis from 'ioredis'
import { config } from '~/utils/config.js'

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
    return new Redis({
      sentinels: parseSentinelUrls(sentinelUrls),
      name: sentinelMaster,
      ...(password ? { password } : {}),
      ...(resolvedSentinelPassword ? { sentinelPassword: resolvedSentinelPassword } : {}),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableReadyCheck: true,
    })
  }

  if (!url) {
    return undefined
  }

  // Standalone mode — password can be embedded in the URL or supplied separately.
  return new Redis(url, {
    ...(password ? { password } : {}),
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })
}

/**
 * Build the BetterAuth secondary storage adapter for the given auth config.
 * Returns `undefined` when no Redis is configured (sessions persisted in DB).
 */
export function buildSecondaryStorage(
  authConfig: RedisAuthConfig,
): BetterAuthOptions['secondaryStorage'] | undefined {
  const client = buildRedisClient(authConfig)
  return client ? redisStorage({ client }) : undefined
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
