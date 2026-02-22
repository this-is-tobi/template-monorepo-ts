import { deepMerge, removeTrailingSlash, snakeCaseToCamelCase } from './index.js'

describe('utils - functions', () => {
  describe('snakeCaseToCamelCase', () => {
    it('should transform snake_case to camelCase', () => {
      expect(snakeCaseToCamelCase('THIS_IS_A_TEST')).toEqual('thisIsATest')
      expect(snakeCaseToCamelCase('this_is_a_test')).toEqual('thisIsATest')
    })
  })

  describe('deepMerge', () => {
    it('should deep merge objects', () => {
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

    it('should deep merge nested objects preserving all keys', () => {
      const obj1 = { api: { host: 'localhost', port: 3000 } }
      const obj2 = { api: { host: 'custom.host' } }

      const merged = deepMerge(obj1, obj2)

      expect(merged).toEqual({ api: { host: 'custom.host', port: 3000 } })
    })

    it('should handle arrays of different lengths', () => {
      const obj1 = { items: [{ a: 1 }, { a: 2 }] }
      const obj2 = { items: [{ b: 10 }, { b: 20 }, { b: 30 }] }

      const merged = deepMerge(obj1, obj2)

      expect(merged).toEqual({ items: [{ a: 1, b: 10 }, { a: 2, b: 20 }, { b: 30 }] })
    })

    it('should handle keys only in target', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { a: 10 }

      const merged = deepMerge(obj1, obj2)

      expect(merged).toEqual({ a: 10, b: 2 })
    })

    it('should handle keys only in source', () => {
      const obj1 = { a: 1 }
      const obj2 = { a: 10, c: 3 }

      const merged = deepMerge(obj1, obj2)

      expect(merged).toEqual({ a: 10, c: 3 })
    })

    it('should not mutate original objects', () => {
      const obj1 = { nested: { a: 1 } }
      const obj2 = { nested: { b: 2 } }

      deepMerge(obj1, obj2)

      expect(obj1).toEqual({ nested: { a: 1 } })
      expect(obj2).toEqual({ nested: { b: 2 } })
    })
  })

  describe('removeTrailingSlash', () => {
    it('should remove single trailing slash', () => {
      expect(removeTrailingSlash('/api/v1/')).toEqual('/api/v1')
      expect(removeTrailingSlash('/users/')).toEqual('/users')
    })

    it('should remove multiple trailing slashes', () => {
      expect(removeTrailingSlash('/api/v1///')).toEqual('/api/v1')
      expect(removeTrailingSlash('/users//')).toEqual('/users')
    })

    it('should not modify paths without trailing slashes', () => {
      expect(removeTrailingSlash('/api/v1')).toEqual('/api/v1')
      expect(removeTrailingSlash('/users')).toEqual('/users')
      expect(removeTrailingSlash('')).toEqual('')
    })

    it('should handle root slash', () => {
      expect(removeTrailingSlash('/')).toEqual('')
      expect(removeTrailingSlash('///')).toEqual('')
    })
  })
})
