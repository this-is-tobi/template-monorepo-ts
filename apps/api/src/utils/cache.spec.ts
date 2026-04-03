import { createCache } from './cache.js'

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

    const cache = createCache<{ name: string }>(mockRedis as any, {
      prefix: 'app:test:',
      ttlSeconds: 30,
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
    })

    it('get returns undefined when Redis throws', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('connection refused'))
      const result = await cache.get('fail')
      expect(result).toBeUndefined()
    })

    it('set is no-op when Redis throws', async () => {
      mockRedis.set.mockRejectedValueOnce(new Error('connection refused'))
      await expect(cache.set('fail', { name: 'x' })).resolves.toBeUndefined()
    })

    it('del is no-op when Redis throws', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('connection refused'))
      await expect(cache.del('fail')).resolves.toBeUndefined()
    })
  })
})
