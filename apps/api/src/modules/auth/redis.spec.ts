import Redis from 'ioredis'
import { buildRedisClient, buildSecondaryStorage, parseSentinelUrls } from './redis.js'

// ---------------------------------------------------------------------------
// Isolation: ioredis is mocked so no real network connections are made.
// ---------------------------------------------------------------------------

vi.mock('ioredis', () => {
  const MockRedis = vi.fn().mockImplementation(function (this: Record<string, unknown>, urlOrOpts: unknown, opts?: unknown) {
    this._url = urlOrOpts
    this._opts = opts
  }) as unknown as typeof Redis
  return { default: MockRedis }
})

// @better-auth/redis-storage is a thin wrapper — mock it to avoid its own deps.
vi.mock('@better-auth/redis-storage', () => ({
  redisStorage: vi.fn((args: unknown) => ({ __redisStorage: true, ...args as object })),
}))

const defaultConfig = {
  url: '',
  sentinelUrls: '',
  sentinelMaster: 'mymaster',
  password: '',
  sentinelPassword: '',
}

// ---------------------------------------------------------------------------
// parseSentinelUrls
// ---------------------------------------------------------------------------
describe('[Auth] - parseSentinelUrls', () => {
  it('parses a single host:port entry', () => {
    expect(parseSentinelUrls('redis:26379')).toEqual([{ host: 'redis', port: 26379 }])
  })

  it('parses multiple entries separated by commas', () => {
    expect(parseSentinelUrls('redis-1:26379, redis-2:26379, redis-3:26379')).toEqual([
      { host: 'redis-1', port: 26379 },
      { host: 'redis-2', port: 26379 },
      { host: 'redis-3', port: 26379 },
    ])
  })

  it('defaults to port 26379 when port is missing', () => {
    expect(parseSentinelUrls('redis-host')).toEqual([{ host: 'redis-host', port: 26379 }])
  })

  it('defaults to port 26379 when port is non-numeric', () => {
    expect(parseSentinelUrls('redis:notaport')).toEqual([{ host: 'redis', port: 26379 }])
  })

  it('handles IPv4 addresses with port', () => {
    expect(parseSentinelUrls('10.0.0.1:26379')).toEqual([{ host: '10.0.0.1', port: 26379 }])
  })
})

// ---------------------------------------------------------------------------
// buildRedisClient
// ---------------------------------------------------------------------------
describe('[Auth] - buildRedisClient', () => {
  beforeEach(() => {
    vi.mocked(Redis).mockClear()
  })

  it('returns undefined when no Redis config is set', () => {
    const client = buildRedisClient(defaultConfig)
    expect(client).toBeUndefined()
    expect(Redis).not.toHaveBeenCalled()
  })

  it('creates a standalone client from url', () => {
    const client = buildRedisClient({ ...defaultConfig, url: 'redis://localhost:6379' })
    expect(client).toBeDefined()
    expect(Redis).toHaveBeenCalledOnce()
    expect(Redis).toHaveBeenCalledWith('redis://localhost:6379', expect.objectContaining({
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    }))
  })

  it('adds password override to standalone client when password is set', () => {
    buildRedisClient({ ...defaultConfig, url: 'redis://localhost:6379', password: 'secret' })
    expect(Redis).toHaveBeenCalledWith('redis://localhost:6379', expect.objectContaining({
      password: 'secret',
    }))
  })

  it('creates a sentinel client from sentinelUrls, taking precedence over url', () => {
    const client = buildRedisClient({
      ...defaultConfig,
      url: 'redis://ignored:6379', // must be ignored
      sentinelUrls: 'redis-1:26379,redis-2:26379',
      sentinelMaster: 'mymaster',
    })
    expect(client).toBeDefined()
    expect(Redis).toHaveBeenCalledOnce()
    expect(Redis).toHaveBeenCalledWith(expect.objectContaining({
      sentinels: [
        { host: 'redis-1', port: 26379 },
        { host: 'redis-2', port: 26379 },
      ],
      name: 'mymaster',
      lazyConnect: true,
      enableReadyCheck: true,
    }))
  })

  it('sets password (node) and sentinelPassword (sentinel) when password is provided and sentinelPassword is empty', () => {
    buildRedisClient({
      ...defaultConfig,
      sentinelUrls: 'redis:26379',
      password: 's3cr3t',
    })
    expect(Redis).toHaveBeenCalledWith(expect.objectContaining({
      password: 's3cr3t',
      sentinelPassword: 's3cr3t',
    }))
  })

  it('uses sentinelPassword for sentinelPassword when it differs from password', () => {
    buildRedisClient({
      ...defaultConfig,
      sentinelUrls: 'redis:26379',
      password: 'node-pass',
      sentinelPassword: 'sentinel-pass',
    })
    expect(Redis).toHaveBeenCalledWith(expect.objectContaining({
      password: 'node-pass',
      sentinelPassword: 'sentinel-pass',
    }))
  })

  it('omits password/sentinelPassword when password is empty in sentinel mode', () => {
    buildRedisClient({ ...defaultConfig, sentinelUrls: 'redis:26379' })
    expect(Redis).not.toHaveBeenCalledWith(expect.objectContaining({ password: expect.anything() }))
    expect(Redis).not.toHaveBeenCalledWith(expect.objectContaining({ sentinelPassword: expect.anything() }))
  })
})

// ---------------------------------------------------------------------------
// buildSecondaryStorage
// ---------------------------------------------------------------------------
describe('[Auth] - buildSecondaryStorage', () => {
  beforeEach(() => {
    vi.mocked(Redis).mockClear()
  })

  it('returns undefined when no Redis is configured', () => {
    expect(buildSecondaryStorage(defaultConfig)).toBeUndefined()
  })

  it('returns a storage adapter when url is set', () => {
    const storage = buildSecondaryStorage({ ...defaultConfig, url: 'redis://localhost:6379' })
    expect(storage).toBeDefined()
  })

  it('returns a storage adapter when sentinel is configured', () => {
    const storage = buildSecondaryStorage({ ...defaultConfig, sentinelUrls: 'redis:26379' })
    expect(storage).toBeDefined()
  })
})
