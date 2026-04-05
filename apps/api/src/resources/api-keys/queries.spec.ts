import { randomUUID } from 'node:crypto'
import { db } from '~/prisma/__mocks__/clients.js'
import { getApiKeyByIdQuery, updateApiKeyQuery } from './queries.js'

vi.mock('~/database.js')

describe('[ApiKeys] - Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const keyId = randomUUID()

  describe('getApiKeyByIdQuery', () => {
    it('should fetch an API key by ID excluding key hash', async () => {
      const mockKey = { id: keyId, name: 'Test Key', referenceId: randomUUID() }
      db.apiKey.findUnique.mockResolvedValueOnce(mockKey as never)

      const result = await getApiKeyByIdQuery(keyId)

      expect(db.apiKey.findUnique).toHaveBeenCalledWith({
        where: { id: keyId },
        omit: { key: true },
      })
      expect(result).toStrictEqual(mockKey)
    })

    it('should return null when key not found', async () => {
      db.apiKey.findUnique.mockResolvedValueOnce(null)

      const result = await getApiKeyByIdQuery(randomUUID())

      expect(result).toBeNull()
    })
  })

  describe('updateApiKeyQuery', () => {
    it('should update name', async () => {
      const updated = { id: keyId, name: 'New Name' }
      db.apiKey.update.mockResolvedValueOnce(updated as never)

      const result = await updateApiKeyQuery(keyId, { name: 'New Name' })

      expect(db.apiKey.update).toHaveBeenCalledWith({
        where: { id: keyId },
        data: { name: 'New Name' },
        omit: { key: true },
      })
      expect(result).toStrictEqual(updated)
    })

    it('should update permissions as JSON string', async () => {
      const perms = JSON.stringify({ project: ['read'] })
      const updated = { id: keyId, permissions: perms }
      db.apiKey.update.mockResolvedValueOnce(updated as never)

      const result = await updateApiKeyQuery(keyId, { permissions: perms })

      expect(db.apiKey.update).toHaveBeenCalledWith({
        where: { id: keyId },
        data: { permissions: perms },
        omit: { key: true },
      })
      expect(result).toStrictEqual(updated)
    })

    it('should update metadata', async () => {
      const metadata = JSON.stringify({ organizationIds: ['org-1'] })
      const updated = { id: keyId, metadata }
      db.apiKey.update.mockResolvedValueOnce(updated as never)

      const result = await updateApiKeyQuery(keyId, { metadata })

      expect(db.apiKey.update).toHaveBeenCalledWith({
        where: { id: keyId },
        data: { metadata },
        omit: { key: true },
      })
      expect(result).toStrictEqual(updated)
    })
  })
})
