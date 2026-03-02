import { randomUUID } from 'node:crypto'
import { apiPrefix } from '@template-monorepo-ts/shared'
import { mockUser } from '~/__mocks__/factories.js'

import app from '~/app.js'
import { db } from '~/prisma/__mocks__/clients.js'
import { userMessages } from './constants.js'

// Mock the database module
vi.mock('~/database.js')

/** Route body type — matches the route schema (no auth-managed fields) */
interface UserBody { firstname: string, lastname: string, email: string, bio?: string | null }

describe('[Users] - router', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
  })

  describe('createUser', () => {
    it('should create new user', async () => {
      const body: UserBody = {
        firstname: 'Jean',
        lastname: 'DUPOND',
        email: 'jean.dupond@test.com',
      }
      const created = mockUser({ id: randomUUID(), ...body })
      db.user.create.mockResolvedValueOnce(created)

      const response = await app.inject()
        .post(`${apiPrefix.v1}/users`)
        .body(body)
        .end()

      expect(db.user.create).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(201)
      expect(response.json().data).toMatchObject(body)
    })

    it('should not create new user - missing "email" required key', async () => {
      const body = {
        firstname: 'Jean',
        lastname: 'DUPOND',
      }

      const response = await app.inject()
        .post(`${apiPrefix.v1}/users`)
        .body(body)
        .end()

      expect(db.user.create).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(400)

      const responseBody = response.json()
      expect(responseBody).toBeDefined()
    })

    it('should not create new user - unexpected error', async () => {
      db.user.create.mockRejectedValueOnce(new Error('unexpected error'))

      const body: UserBody = {
        firstname: 'Jean',
        lastname: 'DUPOND',
        email: 'jean.dupond@test.com',
      }

      const response = await app.inject()
        .post(`${apiPrefix.v1}/users`)
        .body(body)
        .end()

      expect(db.user.create).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(500)
    })
  })

  describe('getUsers', () => {
    it('should retrieve all users', async () => {
      db.user.findMany.mockResolvedValueOnce([])

      const response = await app.inject()
        .get(`${apiPrefix.v1}/users`)
        .end()

      expect(db.user.findMany).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
      expect(response.json().data).toMatchObject([])
    })
  })

  describe('getUserById', () => {
    it('should retrieve user by its ID', async () => {
      const userId = randomUUID()
      const user = mockUser({ id: userId, firstname: 'Jean', lastname: 'DUPOND', email: 'jean.dupond@test.com' })
      db.user.findUnique.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/users/${userId}`)
        .end()

      expect(db.user.findUnique).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
      expect(response.json().data.id).toEqual(userId)
      expect(response.json().data.email).toEqual('jean.dupond@test.com')
    })

    it('should handle missing user', async () => {
      const userId = randomUUID()
      db.user.findUnique.mockResolvedValueOnce(null)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/users/${userId}`)
        .end()

      expect(db.user.findUnique).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(404)
    })
  })

  describe('updateUser', () => {
    it('should update user by its ID', async () => {
      const userId = randomUUID()
      const body: UserBody = {
        firstname: 'Jeanne',
        lastname: 'DUPOND',
        email: 'jeanne.dupond@test.com',
      }
      const existing = mockUser({ id: userId, firstname: 'Jean', lastname: 'DUPOND', email: 'jean.dupond@test.com' })
      const updated = mockUser({ id: userId, ...body })

      db.user.findUnique.mockResolvedValueOnce(existing)
      db.user.update.mockResolvedValueOnce(updated)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/users/${userId}`)
        .body(body)
        .end()

      expect(db.user.findUnique).toHaveBeenCalledTimes(1)
      expect(db.user.update).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
    })

    it('should handle missing user when updating', async () => {
      const userId = randomUUID()
      const body: UserBody = {
        firstname: 'Jeanne',
        lastname: 'DUPOND',
        email: 'jeanne.dupond@test.com',
      }

      const businessModule = await import('./business.js')
      const updateUserSpy = vi.spyOn(businessModule, 'updateUser')
      updateUserSpy.mockResolvedValueOnce(null as any)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/users/${userId}`)
        .body(body)
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.json().message).toEqual(userMessages.notFound)

      updateUserSpy.mockRestore()
    })
  })

  describe('deleteUser', () => {
    it('should delete user by its ID', async () => {
      const userId = randomUUID()
      const existing = mockUser({ id: userId, firstname: 'Jean', lastname: 'DUPOND', email: 'jean.dupond@test.com' })

      db.user.findUnique.mockResolvedValueOnce(existing)
      db.user.delete.mockResolvedValueOnce(existing)

      const response = await app.inject()
        .delete(`${apiPrefix.v1}/users/${userId}`)
        .end()

      expect(db.user.findUnique).toHaveBeenCalledTimes(1)
      expect(db.user.delete).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
    })

    it('should handle missing user when deleting', async () => {
      const userId = randomUUID()

      const businessModule = await import('./business.js')
      const deleteUserSpy = vi.spyOn(businessModule, 'deleteUser')
      deleteUserSpy.mockResolvedValueOnce(null as any)

      const response = await app.inject()
        .delete(`${apiPrefix.v1}/users/${userId}`)
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.json().message).toEqual(userMessages.notFound)

      deleteUserSpy.mockRestore()
    })
  })
})
