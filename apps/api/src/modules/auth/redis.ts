import type { BetterAuthOptions } from 'better-auth'
import { redisStorage } from '@better-auth/redis-storage'
import Redis from 'ioredis'

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

/** Subset of the auth config consumed by this module. */
export interface RedisAuthConfig {
  redisUrl: string
  redisSentinelUrls: string
  redisSentinelMaster: string
  /** Password for Redis nodes (standalone and sentinel `password` field). */
  redisPassword: string
  /**
   * Password for Sentinel nodes (`sentinelPassword` field).
   * Falls back to `redisPassword` when not set, covering the common case where
   * both Redis nodes and Sentinels share the same password.
   */
  redisSentinelPassword: string
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
  const { redisUrl, redisSentinelUrls, redisSentinelMaster, redisPassword, redisSentinelPassword } = authConfig
  // In sentinel mode, the node password and sentinel password may differ.
  // Use the dedicated sentinel password when available, fall back to the shared one.
  const resolvedSentinelPassword = redisSentinelPassword || redisPassword

  if (redisSentinelUrls) {
    // Sentinel mode — ioredis requires an object constructor, not a URL string.
    return new Redis({
      sentinels: parseSentinelUrls(redisSentinelUrls),
      name: redisSentinelMaster,
      ...(redisPassword ? { password: redisPassword } : {}),
      ...(resolvedSentinelPassword ? { sentinelPassword: resolvedSentinelPassword } : {}),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableReadyCheck: true,
    })
  }

  if (!redisUrl) {
    return undefined
  }

  // Standalone mode — password can be embedded in the URL or supplied separately.
  return new Redis(redisUrl, {
    ...(redisPassword ? { password: redisPassword } : {}),
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
