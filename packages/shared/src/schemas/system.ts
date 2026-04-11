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

const ComponentStatusSchema = z.object({
  status: z.enum(['ok', 'unavailable']),
  message: z.string().optional(),
})

/** Request/response schema for `GET /system/readyz` (deep health check with component probes). */
export const GetReadyzSchema = {
  responses: {
    200: z.object({
      status: z.enum(['OK', 'KO']),
      components: z.record(z.string(), ComponentStatusSchema),
    }),
    503: z.object({
      status: z.enum(['OK', 'KO']),
      components: z.record(z.string(), ComponentStatusSchema),
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
