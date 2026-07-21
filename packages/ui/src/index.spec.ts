import { describe, expect, it } from 'vitest'
import { cn } from './index'

describe('ui package', () => {
  it('should merge class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('should resolve tailwind conflicts (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('should handle conditional and array inputs', () => {
    expect(cn('base', { hidden: false, block: true }, ['extra'])).toBe('base block extra')
  })
})
