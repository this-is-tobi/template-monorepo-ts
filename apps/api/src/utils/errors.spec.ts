import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { buildZodReport } from './errors.js'

describe('Errors - functions', () => {
  describe('buildZodReport', () => {
    it('Should get the appropriate NODE_ENV with value "development"', () => {
      const TestSchema = z.object({
        firstname: z.string()
          .min(3, { message: 'firstname must be 3 at least characters long' })
          .max(20, { message: 'firstname must not exceed 20 characters' }),
      })

      const testValidation = TestSchema.safeParse({ firstname: '' })
      const testErrorReport = !testValidation.success && buildZodReport(testValidation.error)

      expect(testErrorReport).toMatchObject({ firstname: 'firstname must be 3 at least characters long' })
    })
  })
})
