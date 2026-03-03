import { ApiClient, apiRoutes, getApiClient } from './client.js'

// Mock fetch globally
const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

describe('api-client', () => {
  describe('apiRoutes', () => {
    it('should contain projects and system routes', () => {
      expect(apiRoutes).toHaveProperty('projects')
      expect(apiRoutes).toHaveProperty('system')
    })

    it('should have projects routes with all expected endpoints', () => {
      const projectRouteNames = Object.keys(apiRoutes.projects)
      expect(projectRouteNames).toEqual(['createProject', 'getProjects', 'getProjectById', 'updateProject', 'deleteProject'])
    })

    it('should have system routes with all expected endpoints', () => {
      const systemRouteNames = Object.keys(apiRoutes.system)
      expect(systemRouteNames).toEqual(['getVersion', 'getHealth', 'getReady', 'getLive'])
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

    it('should have projects convenience methods', () => {
      expect(client.projects).toHaveProperty('create')
      expect(client.projects).toHaveProperty('getAll')
      expect(client.projects).toHaveProperty('getById')
      expect(client.projects).toHaveProperty('update')
      expect(client.projects).toHaveProperty('delete')
    })

    it('should have system convenience methods', () => {
      expect(client.system).toHaveProperty('getVersion')
      expect(client.system).toHaveProperty('getHealth')
      expect(client.system).toHaveProperty('getReady')
      expect(client.system).toHaveProperty('getLive')
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
        ok: true,
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
        ok: true,
        status: 201,
        statusText: 'Created',
        json: vi.fn().mockResolvedValue({ id: '123', name: 'John Doe' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const body = { name: 'My Project', ownerId: '123e4567-e89b-12d3-a456-426614174000' }
      const result = await client.request(apiRoutes.projects.createProject, { body })

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/projects', {
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
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ id: '123', name: 'John Doe' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await client.request(apiRoutes.projects.getProjectById, {
        params: { id: '123' },
      })

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/projects/123', {
        method: 'GET',
        headers: { 'X-Custom-Header': 'test' },
      })
      expect(result.data).toEqual({ id: '123', name: 'John Doe' })
    })

    it('should handle simple GET requests correctly', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ data: [] }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await client.request(apiRoutes.projects.getProjects)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/projects',
        {
          method: 'GET',
          headers: { 'X-Custom-Header': 'test' },
        },
      )
      expect(result.data).toEqual({ data: [] })
    })

    it('should handle query parameters', async () => {
      const mockResponse = {
        ok: true,
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

      // Test with query parameters including null and undefined
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
        ok: true,
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
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ id: '123', name: 'Jane Doe' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const body = { name: 'Updated Project' }
      const result = await client.request(apiRoutes.projects.updateProject, {
        params: { id: '123' },
        body,
      })

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/projects/123', {
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
        ok: true,
        status: 204,
        statusText: 'No Content',
        json: vi.fn().mockResolvedValue(undefined),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await client.request(apiRoutes.projects.deleteProject, {
        params: { id: '123' },
      })

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/projects/123', {
        method: 'DELETE',
        headers: { 'X-Custom-Header': 'test' },
      })
      expect(result.status).toBe(204)
    })

    it('should merge custom headers with base headers', async () => {
      const mockResponse = {
        ok: true,
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

    it('should throw ApiError for non-ok responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: vi.fn().mockResolvedValue({ message: 'user not found' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(client.request(apiRoutes.projects.getProjectById, {
        params: { id: 'nonexistent' },
      })).rejects.toThrow('API Error: 404 Not Found')
    })
  })

  describe('apiClient convenience methods', () => {
    let client: ApiClient

    beforeEach(() => {
      client = new ApiClient({ baseUrl: 'http://localhost:3000' })
      mockFetch.mockClear()
    })

    describe('projects methods', () => {
      it('should call create project endpoint', async () => {
        const mockResponse = {
          ok: true,
          status: 201,
          statusText: 'Created',
          json: vi.fn().mockResolvedValue({ id: '123' }),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const result = await client.projects.create({ name: 'My Project', ownerId: '123e4567-e89b-12d3-a456-426614174000' })

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'My Project', ownerId: '123e4567-e89b-12d3-a456-426614174000' }),
        })
        expect(result.data).toEqual({ id: '123' })
      })

      it('should call get all projects endpoint', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({ projects: [] }),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const result = await client.projects.getAll()

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/projects', {
          method: 'GET',
          headers: {},
        })
        expect(result.data).toEqual({ projects: [] })
      })

      it('should call get project by id endpoint', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({ id: '123', name: 'John' }),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const result = await client.projects.getById('123')

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/projects/123', {
          method: 'GET',
          headers: {},
        })
        expect(result.data).toEqual({ id: '123', name: 'John' })
      })

      it('should call update project endpoint', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({ id: '123', name: 'Jane' }),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const result = await client.projects.update('123', { name: 'Updated Project' })

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/projects/123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Updated Project' }),
        })
        expect(result.data).toEqual({ id: '123', name: 'Jane' })
      })

      it('should call delete project endpoint', async () => {
        const mockResponse = {
          ok: true,
          status: 204,
          statusText: 'No Content',
          json: vi.fn().mockResolvedValue(undefined),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const result = await client.projects.delete('123')

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/projects/123', {
          method: 'DELETE',
          headers: {},
        })
        expect(result.status).toBe(204)
      })
    })

    describe('system methods', () => {
      it('should call get version endpoint', async () => {
        const mockResponse = {
          ok: true,
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
          ok: true,
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
        ok: true,
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
