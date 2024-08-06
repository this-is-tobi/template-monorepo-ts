import { getNodeEnv } from './functions.js'

describe('utils - functions', () => {
  describe('getNodeEnv', () => {
    it('should get the appropriate NODE_ENV with value "development"', () => {
      process.env.NODE_ENV = 'development'
      expect(getNodeEnv()).toStrictEqual('development')
    })

    it('should get the appropriate NODE_ENV with value "test"', () => {
      process.env.NODE_ENV = 'test'
      expect(getNodeEnv()).toStrictEqual('test')
    })

    it('should get the appropriate NODE_ENV with value "production"', () => {
      process.env.NODE_ENV = 'production'
      expect(getNodeEnv()).toStrictEqual('production')
    })

    it('should get the default NODE_ENV with wrong value', () => {
      process.env.NODE_ENV = 'nope'
      expect(getNodeEnv()).toStrictEqual('production')
    })
  })
})
