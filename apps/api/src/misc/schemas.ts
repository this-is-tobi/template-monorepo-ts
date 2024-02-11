import { z } from 'zod'

export const ErrorSchema = z.object({
  message: z.string()
    .optional(),
  error: z.unknown(),
})

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
