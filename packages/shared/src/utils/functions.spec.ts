import { deepMerge, snakeCaseToCamelCase } from './index.js'

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
  })
})
