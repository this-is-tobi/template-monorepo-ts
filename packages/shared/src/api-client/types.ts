import type { z } from 'zod'

/**
 * HTTP methods supported by the API
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/**
 * Route definition with Zod schemas for validation
 */
export interface RouteDefinition {
  method: HttpMethod
  path: string
  summary?: string
  description?: string
  tags?: string[]
  params?: z.ZodType<unknown>
  query?: z.ZodType<unknown>
  body?: z.ZodType<unknown>
  responses: {
    [statusCode: number]: z.ZodType<unknown>
  }
}

/**
 * Collection of route definitions organized by resource
 */
export interface ApiRoutes {
  [resource: string]: {
    [operation: string]: RouteDefinition
  }
}

/**
 * Extract types from route definitions for type-safe client generation
 */
export type RouteParams<T extends RouteDefinition> = T['params'] extends z.ZodType<unknown>
  ? z.infer<T['params']>
  : never

export type RouteQuery<T extends RouteDefinition> = T['query'] extends z.ZodType<unknown>
  ? z.infer<T['query']>
  : never

export type RouteBody<T extends RouteDefinition> = T['body'] extends z.ZodType<unknown>
  ? z.infer<T['body']>
  : never

export type RouteResponse<T extends RouteDefinition, S extends keyof T['responses'] = 200>
  = S extends keyof T['responses'] ? z.infer<T['responses'][S]> : never

/**
 * Get the success response type from a route definition.
 * Checks common success status codes in order: 200, 201, 202, 204
 */
export type RouteSuccessResponse<T extends RouteDefinition>
  // Try 200 first (most common)
  = 200 extends keyof T['responses']
    ? z.infer<T['responses'][200]>
    // Then try 201 (created)
    : 201 extends keyof T['responses']
      ? z.infer<T['responses'][201]>
      // Then try 202 (accepted)
      : 202 extends keyof T['responses']
        ? z.infer<T['responses'][202]>
        // Then try 204 (no content)
        : 204 extends keyof T['responses']
          ? z.infer<T['responses'][204]>
          // Fallback to unknown if no success status found
          : unknown
