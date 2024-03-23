import { describe, it, expect } from 'vitest'
import { getNodeEnv } from './functions.js'

describe('Utils - functions', () => {
  describe('getNodeEnv', () => {
    it('Should get the appropriate NODE_ENV with value "development"', () => {
      process.env.NODE_ENV = 'development'
      expect(getNodeEnv()).toStrictEqual('development')
    })

    it('Should get the appropriate NODE_ENV with value "test"', () => {
      process.env.NODE_ENV = 'test'
      expect(getNodeEnv()).toStrictEqual('test')
    })

    it('Should get the appropriate NODE_ENV with value "production"', () => {
      process.env.NODE_ENV = 'production'
      expect(getNodeEnv()).toStrictEqual('production')
    })

    it('Should get the default NODE_ENV with wrong value', () => {
      process.env.NODE_ENV = 'nope'
      expect(getNodeEnv()).toStrictEqual('production')
    })
  })
})
