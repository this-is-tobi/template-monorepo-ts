import { apiPrefix, setApiBasePath } from './utils.js'

describe('api-client', () => {
  describe('apiPrefix', () => {
    afterEach(() => {
      // Reset to default (empty) after each test
      setApiBasePath('')
    })

    it('should default to /v1 with no base path', () => {
      expect(apiPrefix.v1).toEqual('/v1')
    })

    it('should be an object with the expected shape', () => {
      expect(typeof apiPrefix).toBe('object')
      expect(apiPrefix).toHaveProperty('v1')
      expect(typeof apiPrefix.v1).toBe('string')
    })

    it('should reflect changes from setApiBasePath', () => {
      setApiBasePath('/api')
      expect(apiPrefix.v1).toEqual('/api/v1')
    })

    it('should support custom base path', () => {
      setApiBasePath('/custom')
      expect(apiPrefix.v1).toEqual('/custom/v1')
    })
  })
})
