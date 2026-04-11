import { createCache, createStore } from './cache.js'

function mockLogger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn(), fatal: vi.fn() } as any
}

describe('utils/cache', () => {
  describe('createCache — no-op (no Redis)', () => {
    const cache = createCache<{ name: string }>(undefined, { prefix: 'test:', ttlSeconds: 60 })

    it('get returns undefined', async () => {
      expect(await cache.get('key')).toBeUndefined()
    })

    it('set and del are no-ops', async () => {
      await expect(cache.set('key', { name: 'v' })).resolves.toBeUndefined()
      await expect(cache.del('key')).resolves.toBeUndefined()
    })
  })

  describe('createCache — Redis-backed', () => {
    const mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    }

    const logger = mockLogger()
    const cache = createCache<{ name: string }>(mockRedis as any, {
      prefix: 'app:test:',
      ttlSeconds: 30,
      logger,
    })

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('get returns undefined on cache miss', async () => {
      mockRedis.get.mockResolvedValueOnce(null)
      const result = await cache.get('key1')
      expect(result).toBeUndefined()
      expect(mockRedis.get).toHaveBeenCalledWith('app:test:key1')
    })

    it('get returns parsed JSON on cache hit', async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({ name: 'hello' }))
      const result = await cache.get('key2')
      expect(result).toStrictEqual({ name: 'hello' })
      expect(mockRedis.get).toHaveBeenCalledWith('app:test:key2')
    })

    it('set serializes value and sets with TTL', async () => {
      mockRedis.set.mockResolvedValueOnce('OK')
      await cache.set('key3', { name: 'world' })
      expect(mockRedis.set).toHaveBeenCalledWith(
        'app:test:key3',
        JSON.stringify({ name: 'world' }),
        'EX',
        30,
      )
    })

    it('del removes the key', async () => {
      mockRedis.del.mockResolvedValueOnce(1)
      await cache.del('key4')
      expect(mockRedis.del).toHaveBeenCalledWith('app:test:key4')
    })

    it('get returns undefined on corrupted JSON', async () => {
      mockRedis.get.mockResolvedValueOnce('not-valid-json{')
      const result = await cache.get('bad')
      expect(result).toBeUndefined()
      expect(logger.warn).toHaveBeenCalledOnce()
    })

    it('get returns undefined when Redis throws', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('connection refused'))
      const result = await cache.get('fail')
      expect(result).toBeUndefined()
      expect(logger.warn).toHaveBeenCalledOnce()
    })

    it('set is no-op when Redis throws', async () => {
      mockRedis.set.mockRejectedValueOnce(new Error('connection refused'))
      await expect(cache.set('fail', { name: 'x' })).resolves.toBeUndefined()
      expect(logger.warn).toHaveBeenCalledOnce()
    })

    it('del is no-op when Redis throws', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('connection refused'))
      await expect(cache.del('fail')).resolves.toBeUndefined()
      expect(logger.warn).toHaveBeenCalledOnce()
    })
  })

  describe('createStore — in-memory fallback (no Redis)', () => {
    it('stores and retrieves values', async () => {
      const store = createStore<{ name: string }>(undefined, { prefix: 'test:', ttlSeconds: 60 })
      await store.set('k1', { name: 'hello' })
      expect(await store.get('k1')).toStrictEqual({ name: 'hello' })
    })

    it('del removes a value', async () => {
      const store = createStore<string>(undefined, { prefix: 'test:', ttlSeconds: 60 })
      await store.set('k1', 'val')
      await store.del('k1')
      expect(await store.get('k1')).toBeUndefined()
    })

    it('get returns undefined for missing keys', async () => {
      const store = createStore<string>(undefined, { prefix: 'test:', ttlSeconds: 60 })
      expect(await store.get('missing')).toBeUndefined()
    })

    it('evicts the oldest entry when maxMemoryEntries is reached', async () => {
      const store = createStore<number>(undefined, {
        prefix: 'test:',
        ttlSeconds: 60,
        maxMemoryEntries: 3,
      })

      await store.set('a', 1)
      await store.set('b', 2)
      await store.set('c', 3)
      // Adding a 4th entry should evict 'a' (oldest)
      await store.set('d', 4)

      expect(await store.get('a')).toBeUndefined()
      expect(await store.get('b')).toBe(2)
      expect(await store.get('d')).toBe(4)
    })
  })

  describe('createStore — Redis-backed', () => {
    const mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    }

    const store = createStore<{ name: string }>(mockRedis as never, {
      prefix: 'store:test:',
      ttlSeconds: 120,
    })

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('delegates get to Redis with prefixed key', async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({ name: 'val' }))
      expect(await store.get('k1')).toStrictEqual({ name: 'val' })
      expect(mockRedis.get).toHaveBeenCalledWith('store:test:k1')
    })

    it('delegates set to Redis with TTL', async () => {
      mockRedis.set.mockResolvedValueOnce('OK')
      await store.set('k2', { name: 'v2' })
      expect(mockRedis.set).toHaveBeenCalledWith(
        'store:test:k2',
        JSON.stringify({ name: 'v2' }),
        'EX',
        120,
      )
    })

    it('delegates del to Redis', async () => {
      mockRedis.del.mockResolvedValueOnce(1)
      await store.del('k3')
      expect(mockRedis.del).toHaveBeenCalledWith('store:test:k3')
    })
  })
})
