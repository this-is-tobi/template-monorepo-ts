import { z } from 'zod'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { ErrorSchema } from './utils.js'

extendZodWithOpenApi(z)

export const GetVersionSchema = {
  responses: {
    200: z.object({
      version: z.string(),
    }),
    500: ErrorSchema,
  },
}

export const GetHealthzSchema = {
  responses: {
    200: z.object({
      status: z.enum(['OK', 'KO']),
    }),
    500: ErrorSchema,
  },
}
