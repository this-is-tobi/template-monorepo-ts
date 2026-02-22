import { z } from 'zod'
import { ErrorSchema } from './utils.js'

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

export const GetReadyzSchema = {
  responses: {
    200: z.object({
      status: z.enum(['OK', 'KO']),
    }),
    503: z.object({
      status: z.enum(['OK', 'KO']),
      message: z.string().optional(),
    }),
    500: ErrorSchema,
  },
}

export const GetLivezSchema = {
  responses: {
    200: z.object({
      status: z.enum(['OK', 'KO']),
    }),
    500: ErrorSchema,
  },
}
