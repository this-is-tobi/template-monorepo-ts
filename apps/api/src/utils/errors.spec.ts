import { z } from 'zod'
import { buildZodReport } from './errors.js'

describe('Utils - errors', () => {
  describe('buildZodReport', () => {
    it('Should build an enhanced Zod error report', () => {
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
