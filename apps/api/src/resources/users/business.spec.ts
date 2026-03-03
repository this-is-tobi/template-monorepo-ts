import type { FastifyRequest } from 'fastify'

import { mockUser } from '~/__mocks__/factories.js'
import { createUser, deleteUser, getUserById, getUsers, updateUser } from './business.js'
import { createUserQuery, deleteUserQuery, getUserByIdQuery, getUsersQuery, updateUserQuery } from './queries.js'

vi.mock('~/database.js')
vi.mock('./queries.js', () => ({
  createUserQuery: vi.fn(),
  getUsersQuery: vi.fn(),
  getUserByIdQuery: vi.fn(),
  updateUserQuery: vi.fn(),
  deleteUserQuery: vi.fn(),
}))

const mockCreateUserQuery = vi.mocked(createUserQuery)
const mockGetUsersQuery = vi.mocked(getUsersQuery)
const mockGetUserByIdQuery = vi.mocked(getUserByIdQuery)
const mockUpdateUserQuery = vi.mocked(updateUserQuery)
const mockDeleteUserQuery = vi.mocked(deleteUserQuery)

describe('[Users] - Business', () => {
  const mockReq = {
    log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  } as unknown as FastifyRequest

  const data = {
    id: 'user-123',
    firstname: 'Jean',
    lastname: 'Dupond',
    email: 'jean.dupond@test.com',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createUser', () => {
    it('should create and return a user', async () => {
      const full = mockUser(data)
      mockCreateUserQuery.mockResolvedValueOnce(full)

      const result = await createUser(mockReq, data)

      expect(mockCreateUserQuery).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(full)
    })
  })

  describe('getUsers', () => {
    it('should return all users', async () => {
      const full = mockUser(data)
      mockGetUsersQuery.mockResolvedValueOnce([full])

      const result = await getUsers(mockReq)

      expect(mockGetUsersQuery).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual([full])
    })
  })

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const full = mockUser(data)
      mockGetUserByIdQuery.mockResolvedValueOnce(full)

      const result = await getUserById(mockReq, data.id)

      expect(result).toStrictEqual(full)
    })

    it('should return null and warn when user not found', async () => {
      mockGetUserByIdQuery.mockResolvedValueOnce(null)

      const result = await getUserById(mockReq, data.id)

      expect(result).toBeNull()
      expect(mockReq.log.warn).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateUser', () => {
    it('should update and return user', async () => {
      const full = mockUser({ ...data, bio: 'Hello' })
      mockUpdateUserQuery.mockResolvedValueOnce(full)

      const result = await updateUser(mockReq, data.id, { ...data, bio: 'Hello' })

      expect(mockUpdateUserQuery).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(full)
    })

    it('should return null and warn when user not found', async () => {
      mockUpdateUserQuery.mockResolvedValueOnce(null)

      const result = await updateUser(mockReq, data.id, data)

      expect(result).toBeNull()
      expect(mockReq.log.warn).toHaveBeenCalledTimes(1)
    })
  })

  describe('deleteUser', () => {
    it('should delete and return user', async () => {
      const full = mockUser(data)
      mockDeleteUserQuery.mockResolvedValueOnce(full)

      const result = await deleteUser(mockReq, data.id)

      expect(mockDeleteUserQuery).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(full)
    })

    it('should return null and warn when user not found', async () => {
      mockDeleteUserQuery.mockResolvedValueOnce(null)

      const result = await deleteUser(mockReq, data.id)

      expect(result).toBeNull()
      expect(mockReq.log.warn).toHaveBeenCalledTimes(1)
    })
  })
})
