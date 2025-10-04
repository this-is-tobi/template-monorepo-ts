import { beforeEach, vi } from 'vitest'
import { ApiClient, apiRoutes, getApiClient } from './client.js'

// Mock fetch globally
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe('api-client', () => {
  describe('apiRoutes', () => {
    it('should contain users and system routes', () => {
      expect(apiRoutes).toHaveProperty('users')
      expect(apiRoutes).toHaveProperty('system')
    })

    it('should have users routes with all expected endpoints', () => {
      const userRouteNames = Object.keys(apiRoutes.users)
      expect(userRouteNames).toEqual(['createUser', 'getUsers', 'getUserById', 'updateUser', 'deleteUser'])
    })

    it('should have system routes with all expected endpoints', () => {
      const systemRouteNames = Object.keys(apiRoutes.system)
      expect(systemRouteNames).toEqual(['getVersion', 'getHealth'])
    })
  })

  describe('getApiClient', () => {
    it('should create an ApiClient instance', () => {
      const client = getApiClient('http://localhost:3000')
      expect(client).toBeInstanceOf(ApiClient)
    })

    it('should accept base headers', () => {
      const headers = { Authorization: 'Bearer token' }
      const client = getApiClient('http://localhost:3000', headers)
      expect(client).toBeInstanceOf(ApiClient)
    })
  })

  describe('apiClient', () => {
    let client: ApiClient

    beforeEach(() => {
      client = new ApiClient({
        baseUrl: 'http://localhost:3000',
        baseHeaders: { 'Content-Type': 'application/json' },
      })
    })

    it('should have users convenience methods', () => {
      expect(client.users).toHaveProperty('create')
      expect(client.users).toHaveProperty('getAll')
      expect(client.users).toHaveProperty('getById')
      expect(client.users).toHaveProperty('update')
      expect(client.users).toHaveProperty('delete')
    })

    it('should have system convenience methods', () => {
      expect(client.system).toHaveProperty('getVersion')
      expect(client.system).toHaveProperty('getHealth')
    })

    it('should have request method', () => {
      expect(client.request).toBeDefined()
      expect(typeof client.request).toBe('function')
    })
  })

  describe('apiClient request method', () => {
    let client: ApiClient

    beforeEach(() => {
      client = new ApiClient({
        baseUrl: 'http://localhost:3000',
        baseHeaders: { 'X-Custom-Header': 'test' },
      })
      mockFetch.mockClear()
    })

    it('should make GET requests correctly', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ version: '1.0.0' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await client.request(apiRoutes.system.getVersion)

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/version', {
        method: 'GET',
        headers: { 'X-Custom-Header': 'test' },
      })
      expect(result).toEqual({
        data: { version: '1.0.0' },
        status: 200,
        statusText: 'OK',
      })
    })

    it('should make POST requests with body correctly', async () => {
      const mockResponse = {
        status: 201,
        statusText: 'Created',
        json: vi.fn().mockResolvedValue({ id: '123', name: 'John Doe' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const body = { firstname: 'John', lastname: 'Doe', email: 'john@example.com' }
      const result = await client.request(apiRoutes.users.createUser, { body })

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/users', {
        method: 'POST',
        headers: {
          'X-Custom-Header': 'test',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      expect(result.data).toEqual({ id: '123', name: 'John Doe' })
    })

    it('should handle path parameters correctly', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ id: '123', name: 'John Doe' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await client.request(apiRoutes.users.getUserById, {
        params: { id: '123' },
      })

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/users/123', {
        method: 'GET',
        headers: { 'X-Custom-Header': 'test' },
      })
      expect(result.data).toEqual({ id: '123', name: 'John Doe' })
    })

    it('should handle simple GET requests correctly', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ data: [] }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await client.request(apiRoutes.users.getUsers)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/users',
        {
          method: 'GET',
          headers: { 'X-Custom-Header': 'test' },
        },
      )
      expect(result.data).toEqual({ data: [] })
    })

    it('should handle query parameters', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ version: '1.0.0' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      // Create a mock route for testing query parameters
      const testRoute = {
        method: 'GET' as const,
        path: '/api/v1/test',
        responses: {},
      }

      // Use any to bypass type checking for this test
      await (client.request as any)(testRoute, {
        query: { limit: '10', offset: '20', ignored: null, undefinedValue: undefined },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/test?limit=10&offset=20',
        expect.any(Object),
      )
    })

    it('should handle empty query parameters', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ version: '1.0.0' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await client.request(apiRoutes.system.getVersion, {})

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/version',
        expect.any(Object),
      )
    })

    it('should handle PUT requests with body and params', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ id: '123', name: 'Jane Doe' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const body = { firstname: 'Jane', lastname: 'Doe', email: 'jane@example.com' }
      const result = await client.request(apiRoutes.users.updateUser, {
        params: { id: '123' },
        body,
      })

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/users/123', {
        method: 'PUT',
        headers: {
          'X-Custom-Header': 'test',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      expect(result.data).toEqual({ id: '123', name: 'Jane Doe' })
    })

    it('should handle DELETE requests correctly', async () => {
      const mockResponse = {
        status: 204,
        statusText: 'No Content',
        json: vi.fn().mockResolvedValue(undefined),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await client.request(apiRoutes.users.deleteUser, {
        params: { id: '123' },
      })

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/users/123', {
        method: 'DELETE',
        headers: { 'X-Custom-Header': 'test' },
      })
      expect(result.status).toBe(204)
    })

    it('should merge custom headers with base headers', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ version: '1.0.0' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await client.request(apiRoutes.system.getVersion, {
        headers: { Authorization: 'Bearer token' },
      })

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/version', {
        method: 'GET',
        headers: {
          'X-Custom-Header': 'test',
          Authorization: 'Bearer token',
        },
      })
    })
  })

  describe('apiClient convenience methods', () => {
    let client: ApiClient

    beforeEach(() => {
      client = new ApiClient({ baseUrl: 'http://localhost:3000' })
      mockFetch.mockClear()
    })

    describe('users methods', () => {
      it('should call create user endpoint', async () => {
        const mockResponse = {
          status: 201,
          statusText: 'Created',
          json: vi.fn().mockResolvedValue({ id: '123' }),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const result = await client.users.create({ firstname: 'John', lastname: 'Doe', email: 'john@example.com' })

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstname: 'John', lastname: 'Doe', email: 'john@example.com' }),
        })
        expect(result.data).toEqual({ id: '123' })
      })

      it('should call get all users endpoint', async () => {
        const mockResponse = {
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({ users: [] }),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const result = await client.users.getAll()

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/users', {
          method: 'GET',
          headers: {},
        })
        expect(result.data).toEqual({ users: [] })
      })

      it('should call get user by id endpoint', async () => {
        const mockResponse = {
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({ id: '123', name: 'John' }),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const result = await client.users.getById('123')

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/users/123', {
          method: 'GET',
          headers: {},
        })
        expect(result.data).toEqual({ id: '123', name: 'John' })
      })

      it('should call update user endpoint', async () => {
        const mockResponse = {
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({ id: '123', name: 'Jane' }),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const result = await client.users.update('123', { firstname: 'Jane', lastname: 'Smith', email: 'jane@example.com' })

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/users/123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstname: 'Jane', lastname: 'Smith', email: 'jane@example.com' }),
        })
        expect(result.data).toEqual({ id: '123', name: 'Jane' })
      })

      it('should call delete user endpoint', async () => {
        const mockResponse = {
          status: 204,
          statusText: 'No Content',
          json: vi.fn().mockResolvedValue(undefined),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const result = await client.users.delete('123')

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/users/123', {
          method: 'DELETE',
          headers: {},
        })
        expect(result.status).toBe(204)
      })
    })

    describe('system methods', () => {
      it('should call get version endpoint', async () => {
        const mockResponse = {
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({ version: '1.0.0' }),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const result = await client.system.getVersion()

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/version', {
          method: 'GET',
          headers: {},
        })
        expect(result.data).toEqual({ version: '1.0.0' })
      })

      it('should call get health endpoint', async () => {
        const mockResponse = {
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({ status: 'healthy' }),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const result = await client.system.getHealth()

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/healthz', {
          method: 'GET',
          headers: {},
        })
        expect(result.data).toEqual({ status: 'healthy' })
      })
    })
  })

  describe('apiClient constructor', () => {
    it('should remove trailing slash from baseUrl', () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:3000/' })
      // We can verify this by checking the URL in a request
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({}),
      }
      mockFetch.mockResolvedValue(mockResponse)

      client.request(apiRoutes.system.getVersion)

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/version', expect.any(Object))
    })

    it('should handle empty base headers', () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:3000' })
      expect(client).toBeInstanceOf(ApiClient)
    })
  })
})
