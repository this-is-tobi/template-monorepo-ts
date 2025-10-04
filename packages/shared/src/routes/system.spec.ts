import { systemRoutes } from './system.js'

describe('routes/system', () => {
  describe('systemRoutes', () => {
    it('should have getVersion route configured correctly', () => {
      const route = systemRoutes.getVersion

      expect(route.method).toBe('GET')
      expect(route.path).toBe('/api/v1/version')
      expect(route.summary).toBe('Get version')
      expect(route.description).toBe('Retrieve api version.')
      expect(route.tags).toEqual(['System'])
      expect(route.responses).toBeDefined()
    })

    it('should have getHealth route configured correctly', () => {
      const route = systemRoutes.getHealth

      expect(route.method).toBe('GET')
      expect(route.path).toBe('/api/v1/healthz')
      expect(route.summary).toBe('Get health')
      expect(route.description).toBe('Retrieve api health infos.')
      expect(route.tags).toEqual(['System'])
      expect(route.responses).toBeDefined()
    })

    it('should be readonly object', () => {
      expect(Object.keys(systemRoutes)).toEqual(['getVersion', 'getHealth'])
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
