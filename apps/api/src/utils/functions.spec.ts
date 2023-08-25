import { describe, it, expect } from 'vitest'
import { getNodeEnv } from './index.js'

describe('Utils - functions', () => {
  describe('getNodeEnv', () => {
    it('Should get the appropriate NODE_ENV with value "development"', async () => {
      process.env.NODE_ENV = 'development'
      expect(getNodeEnv()).toStrictEqual('development')
    })

    it('Should get the appropriate NODE_ENV with value "test"', async () => {
      process.env.NODE_ENV = 'test'
      expect(getNodeEnv()).toStrictEqual('test')
    })

    it('Should get the appropriate NODE_ENV with value "production"', async () => {
      process.env.NODE_ENV = 'production'
      expect(getNodeEnv()).toStrictEqual('production')
    })

    it('Should get the default NODE_ENV with wrong value', async () => {
      process.env.NODE_ENV = 'nope'
      expect(getNodeEnv()).toStrictEqual('production')
    })
  })
})
