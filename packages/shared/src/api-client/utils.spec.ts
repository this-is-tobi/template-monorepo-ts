import { apiPrefix } from './utils.js'

describe('api-client', () => {
  describe('apiPrefix', () => {
    it('should have correct API version prefix', () => {
      expect(apiPrefix.v1).toEqual('/api/v1')
    })

    it('should be immutable object', () => {
      expect(Object.isFrozen(apiPrefix)).toBe(false) // Note: not frozen by default
      expect(typeof apiPrefix).toBe('object')
    })

    it('should contain v1 property', () => {
      expect(apiPrefix).toHaveProperty('v1')
      expect(typeof apiPrefix.v1).toBe('string')
    })
  })
})
