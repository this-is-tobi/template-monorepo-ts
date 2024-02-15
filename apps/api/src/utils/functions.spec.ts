import { describe, it, expect } from 'vitest'
import { deepMerge, getNodeEnv, isWritable, makeWritable, snakeCaseToCamelCase } from './functions.js'

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

  describe('snakeCaseToCamelCase', () => {
    it('Should transform snake_case to camelCase', () => {
      expect(snakeCaseToCamelCase('THIS_IS_A_TEST')).toEqual('thisIsATest')
      expect(snakeCaseToCamelCase('this_is_a_test')).toEqual('thisIsATest')
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

  describe('deepMerge', () => {
    it('Should deep merge objects', () => {
      const obj1 = {
        test: {
          1: '1',
          2: 1,
          3: { 1: '1' },
          4: ['1', '1'],
          5: [{ 1: '1' }, { 1: '1' }],
        },
      }
      const obj2 = {
        test: {
          1: '2',
          2: 2,
          3: { 2: '2' },
          4: ['2', '2'],
          5: [{ 2: '2' }, { 2: '2' }],
        },
      }

      const merged = deepMerge(obj1, obj2)
      const expected = {
        test: {
          1: '2',
          2: 2,
          3: { 2: '2' },
          4: ['2', '2'],
          5: [{ 2: '2' }, { 2: '2' }],
        },
      }

      expect(merged).toMatchObject(expected)
    })
  })
})
