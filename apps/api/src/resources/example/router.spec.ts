import { describe, it, expect } from 'vitest'
import app from '@/app.js'
import { apiPrefix } from '@/utils/index.js'

describe('Examples resources', () => {
  describe('POST', () => {
    it('Should create new resource', async () => {
      const response = await app.inject()
        .post(`${apiPrefix}/examples`)
        .body({ name: 'Name' })
        .end()

      expect(response.statusCode).toEqual(201)
    })

    it('Should not create new resource - missing required key', async () => {
      const response = await app.inject()
        .post(`${apiPrefix}/examples`)
        .end()

      expect(response.statusCode).toEqual(500)
    })
  })

  describe('GET - all', () => {
    it('Should retrieve all resources', async () => {
      const response = await app.inject()
        .get(`${apiPrefix}/examples`)
        .end()

      expect(response.statusCode).toEqual(200)
    })
  })

  describe('GET', () => {
    it('Should retrieve resource by its ID', async () => {
      const response = await app.inject()
        .get(`${apiPrefix}/examples/1`)
        .end()

      expect(response.statusCode).toEqual(200)
    })
  })

  describe('PUT', () => {
    it('Should update resource by its ID', async () => {
      const response = await app.inject()
        .put(`${apiPrefix}/examples/1`)
        .body({ name: 'Name' })
        .end()

      expect(response.statusCode).toEqual(200)
    })
  })

  describe('DELETE', () => {
    it('Should delete resource by its ID', async () => {
      const response = await app.inject()
        .delete(`${apiPrefix}/examples/1`)
        .end()

      expect(response.statusCode).toEqual(200)
    })
  })
})
