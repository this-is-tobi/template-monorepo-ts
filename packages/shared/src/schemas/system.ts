import { z } from 'zod'
import { ErrorSchema } from './utils.js'

/** Request/response schema for `GET /system/version`. */
export const GetVersionSchema = {
  responses: {
    200: z.object({
      version: z.string(),
    }),
    500: ErrorSchema,
  },
}

/** Request/response schema for `GET /system/healthz` (shallow health check). */
export const GetHealthzSchema = {
  responses: {
    200: z.object({
      status: z.enum(['OK', 'KO']),
    }),
    500: ErrorSchema,
  },
}

/** Request/response schema for `GET /system/readyz` (deep health check with DB probe). */
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

/** Request/response schema for `GET /system/livez` (liveness probe). */
export const GetLivezSchema = {
  responses: {
    200: z.object({
      status: z.enum(['OK', 'KO']),
    }),
    500: ErrorSchema,
  },
}
