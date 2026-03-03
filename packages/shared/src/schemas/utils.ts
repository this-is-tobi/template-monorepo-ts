import { z } from 'zod'

export const ErrorSchema = z.object({
  message: z.string().optional(),
  error: z.string().optional(),
})

/**
 * Schema for 401 Unauthorized responses
 */
export const UnauthorizedSchema = z.object({ message: z.string() })

/**
 * Schema for 403 Forbidden responses
 */
export const ForbiddenSchema = z.object({ message: z.string(), error: z.string().optional() })
