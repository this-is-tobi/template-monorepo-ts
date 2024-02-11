import { describe, it, expect } from 'vitest'
import { getNodeEnv, isWritable, makeWritable } from './functions.js'

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

  describe('isWritable', () => {
    it('Should return true if a property if writable', () => {
      const test: Record<string, string> = Object.defineProperty({}, 'a', {
        value: 'a',
        writable: false,
        configurable: true,
      })

      expect(isWritable(test, 'a')).toEqual(false)
    })

    it('Should return true if a property if writable', () => {
      const test: Record<string, string> = Object.defineProperty({}, 'a', {
        value: 'a',
        writable: true,
        configurable: true,
      })

      expect(isWritable(test, 'a')).toEqual(true)
    })
  })

  describe('makeWritable', () => {
    it('Should make the object property writable with update value', () => {
      const test: Record<string, string> = Object.defineProperty({}, 'a', {
        value: 'a',
        writable: false,
        configurable: true,
      })

      expect(isWritable(test, 'a')).toEqual(false)
      expect(test.a).toEqual('a')

      makeWritable(test, 'a', 'b')

      expect(isWritable(test, 'a')).toEqual(true)
      expect(test.a).toEqual('b')
    })

    it('Should make the object property writable without update value', () => {
      const test: Record<string, string> = Object.defineProperty({}, 'a', {
        value: 'a',
        writable: false,
        configurable: true,
      })

      expect(isWritable(test, 'a')).toEqual(false)
      expect(test.a).toEqual('a')

      makeWritable(test, 'a')

      expect(isWritable(test, 'a')).toEqual(true)
      expect(test.a).toEqual('a')
    })
  })
})
