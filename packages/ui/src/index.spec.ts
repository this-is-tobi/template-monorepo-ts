import { describe, expect, it } from 'vitest'
import { preset } from './index'

describe('ui package', () => {
  it('should export preset', () => {
    expect(preset).toBeDefined()
  })
})
