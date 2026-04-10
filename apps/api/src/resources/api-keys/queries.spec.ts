import { randomUUID } from 'node:crypto'
import { db } from '~/prisma/__mocks__/clients.js'
import { getApiKeyByIdQuery, updateApiKeyQuery, validateApiKeyScope } from './queries.js'

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

  describe('validateApiKeyScope', () => {
    const userId = randomUUID()

    it('should return valid when no scope is provided', async () => {
      const result = await validateApiKeyScope(userId)

      expect(result).toStrictEqual({ valid: true })
    })

    it('should return valid when user has access to all organizations', async () => {
      db.member.count.mockResolvedValueOnce(2 as never)

      const result = await validateApiKeyScope(userId, ['org-1', 'org-2'])

      expect(db.member.count).toHaveBeenCalledWith({
        where: { userId, organizationId: { in: ['org-1', 'org-2'] } },
      })
      expect(result).toStrictEqual({ valid: true })
    })

    it('should return invalid when user lacks access to an organization', async () => {
      db.member.count.mockResolvedValueOnce(1 as never)

      const result = await validateApiKeyScope(userId, ['org-1', 'org-unknown'])

      expect(result).toStrictEqual({ valid: false, reason: 'One or more organization IDs are not accessible' })
    })

    it('should return valid when user has access to all projects', async () => {
      db.projectMember.count.mockResolvedValueOnce(1 as never)

      const result = await validateApiKeyScope(userId, undefined, ['proj-1'])

      expect(db.projectMember.count).toHaveBeenCalledWith({
        where: { userId, projectId: { in: ['proj-1'] } },
      })
      expect(result).toStrictEqual({ valid: true })
    })

    it('should return invalid when user lacks access to a project', async () => {
      db.projectMember.count.mockResolvedValueOnce(0 as never)

      const result = await validateApiKeyScope(userId, undefined, ['proj-unknown'])

      expect(result).toStrictEqual({ valid: false, reason: 'One or more project IDs are not accessible' })
    })

    it('should validate both org and project IDs', async () => {
      db.member.count.mockResolvedValueOnce(1 as never)
      db.projectMember.count.mockResolvedValueOnce(1 as never)

      const result = await validateApiKeyScope(userId, ['org-1'], ['proj-1'])

      expect(result).toStrictEqual({ valid: true })
    })

    it('should skip empty arrays', async () => {
      const result = await validateApiKeyScope(userId, [], [])

      expect(db.member.count).not.toHaveBeenCalled()
      expect(db.projectMember.count).not.toHaveBeenCalled()
      expect(result).toStrictEqual({ valid: true })
    })
  })
})
