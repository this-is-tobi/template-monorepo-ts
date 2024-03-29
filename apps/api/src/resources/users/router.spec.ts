import { randomUUID } from 'node:crypto'
import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest'
import { type User, UserSchema, apiPrefix } from '@template-monorepo-ts/shared'
import app from '@/app.js'
import { closeDb, initDb } from '@/database.js'
import * as queriesModule from './queries.js'

const createUserQueryMock = vi.spyOn(queriesModule, 'createUserQuery')

describe('Users resources', () => {
  beforeAll(async () => {
    await initDb()
  })
  afterAll(async () => {
    await closeDb()
  })

  beforeEach(async () => {
    await queriesModule._deleteUsers()
    vi.clearAllMocks()
  })

  describe('createUser', () => {
    it('Should create new user', async () => {
      const user: Omit<User, 'id'> = {
        firstname: 'Jean',
        lastname: 'DUPOND',
        email: 'jean.dupond@test.com',
      }

      const response = await app.inject()
        .post(`${apiPrefix.v1}/users`)
        .body(user)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json().data).toMatchObject(user)
    })

    it('Should not create new user - missing "email" required key', async () => {
      const user: Omit<User, 'id' | 'email'> = {
        firstname: 'Jean',
        lastname: 'DUPOND',
      }

      const response = await app.inject()
        .post(`${apiPrefix.v1}/users`)
        .body(user)
        .end()

      const userValidation = UserSchema.omit({ id: true }).safeParse(user)

      expect(response.statusCode).toEqual(400)
      expect(UserSchema.omit({ id: true }).safeParse(user).success).toBe(false)
      !userValidation.success && expect(response.json().bodyErrors.issues).toMatchObject(userValidation.error.issues)
    })

    it('Should not create new user - unexpected error', async () => {
      createUserQueryMock.mockRejectedValueOnce(new Error('unexpected error'))

      const user: Omit<User, 'id'> = {
        firstname: 'Jean',
        lastname: 'DUPOND',
        email: 'jean.dupond@test.com',
      }

      const response = await app.inject()
        .post(`${apiPrefix.v1}/users`)
        .body(user)
        .end()

      expect(response.statusCode).toEqual(500)
    })
  })

  describe('getUsers', () => {
    it('Should retrieve all users', async () => {
      const response = await app.inject()
        .get(`${apiPrefix.v1}/users`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json().data).toMatchObject([])
    })
  })

  describe('getUserById', () => {
    it('Should retrieve user by its ID', async () => {
      const user: Omit<User, 'id'> = {
        firstname: 'Jean',
        lastname: 'DUPOND',
        email: 'jean.dupond@test.com',
      }

      const createdUser = await app.inject()
        .post(`${apiPrefix.v1}/users`)
        .body(user)
        .end()

      const response = await app.inject()
        .get(`${apiPrefix.v1}/users/${createdUser.json().data.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
    })

    it('Should handle missing user', async () => {
      const response = await app.inject()
        .get(`${apiPrefix.v1}/users/${randomUUID()}`)
        .end()

      expect(response.statusCode).toEqual(404)
    })
  })

  describe('updateUser', () => {
    it('Should update user by its ID', async () => {
      const user: Omit<User, 'id'> = {
        firstname: 'Jean',
        lastname: 'DUPOND',
        email: 'jean.dupond@test.com',
      }

      const createdUser = await app.inject()
        .post(`${apiPrefix.v1}/users`)
        .body(user)
        .end()

      const updatedUser: Omit<User, 'id'> = {
        firstname: 'Jeanne',
        lastname: 'DUPOND',
        email: 'jeanne.dupond@test.com',
      }

      const response = await app.inject()
        .put(`${apiPrefix.v1}/users/${createdUser.json().data.id}`)
        .body(updatedUser)
        .end()

      expect(response.statusCode).toEqual(200)
    })
  })

  describe('deleteUser', () => {
    it('Should delete user by its ID', async () => {
      const user: Omit<User, 'id'> = {
        firstname: 'Jean',
        lastname: 'DUPOND',
        email: 'jean.dupond@test.com',
      }

      const createdUser = await app.inject()
        .post(`${apiPrefix.v1}/users`)
        .body(user)
        .end()

      const response = await app.inject()
        .delete(`${apiPrefix.v1}/users/${createdUser.json().data.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
    })
  })
})
