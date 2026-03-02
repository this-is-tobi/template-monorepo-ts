import { apiPrefix } from '../api-client/utils.js'
import { systemRoutes } from './system.js'

describe('routes/system', () => {
  describe('systemRoutes', () => {
    it('should have getVersion route configured correctly', () => {
      const route = systemRoutes.getVersion

      expect(route.method).toBe('GET')
      expect(route.path).toBe(`${apiPrefix.v1}/version`)
      expect(route.summary).toBe('Get version')
      expect(route.description).toBe('Retrieve api version.')
      expect(route.tags).toEqual(['System'])
      expect(route.responses).toBeDefined()
    })

    it('should have getHealth route configured correctly', () => {
      const route = systemRoutes.getHealth

      expect(route.method).toBe('GET')
      expect(route.path).toBe(`${apiPrefix.v1}/healthz`)
      expect(route.summary).toBe('Get health')
      expect(route.description).toBe('Basic health check — confirms the server process is running.')
      expect(route.tags).toEqual(['System'])
      expect(route.responses).toBeDefined()
    })

    it('should have getReady route configured correctly', () => {
      const route = systemRoutes.getReady

      expect(route.method).toBe('GET')
      expect(route.path).toBe(`${apiPrefix.v1}/readyz`)
      expect(route.summary).toBe('Get readiness')
      expect(route.description).toBe('Readiness check — verifies the service can handle traffic (database is reachable).')
      expect(route.tags).toEqual(['System'])
      expect(route.responses).toBeDefined()
    })

    it('should have getLive route configured correctly', () => {
      const route = systemRoutes.getLive

      expect(route.method).toBe('GET')
      expect(route.path).toBe(`${apiPrefix.v1}/livez`)
      expect(route.summary).toBe('Get liveness')
      expect(route.description).toBe('Liveness check — confirms the process is not stuck or deadlocked.')
      expect(route.tags).toEqual(['System'])
      expect(route.responses).toBeDefined()
    })

    it('should be readonly object', () => {
      expect(Object.keys(systemRoutes)).toEqual(['getVersion', 'getHealth', 'getReady', 'getLive'])
      expect(typeof systemRoutes).toBe('object')
    })

    it('should have all required route properties', () => {
      Object.values(systemRoutes).forEach((route) => {
        expect(route).toHaveProperty('method')
        expect(route).toHaveProperty('path')
        expect(route).toHaveProperty('summary')
        expect(route).toHaveProperty('description')
        expect(route).toHaveProperty('tags')
        expect(route).toHaveProperty('responses')
      })
    })
  })
})
