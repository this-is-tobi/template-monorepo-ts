import { repeatFn, isWritable, makeWritable } from './functions.js'

describe('Utils - functions', () => {
  describe('repeatFn', () => {
    it('Should repeat the function as many time as provided', async () => {
      vi.spyOn(await import('./functions.js'), 'repeatFn')
      const fn = vi.fn((x: any) => x)

      repeatFn(3)(fn)

      expect(repeatFn).toHaveBeenCalledOnce()
      expect(fn).toHaveBeenCalledTimes(3)
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

  describe('isWritable', () => {
    it('Should return false if a property if writable', () => {
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
    it('Should make the object property writable with updated value', () => {
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

    it('Should make the object property writable without updated value', () => {
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
