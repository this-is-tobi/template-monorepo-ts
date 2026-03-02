import type { FastifyRequest } from 'fastify'

/**
 * Convert Fastify raw request headers into a standard `Headers` object.
 *
 * Used by BetterAuth's Fetch API–based session resolver and
 * by the auth catch-all handler to forward headers to BetterAuth.
 *
 * @param raw - The Fastify request headers (string | string[] | undefined)
 * @returns A Web-standard Headers instance
 */
export function toHeaders(raw: FastifyRequest['headers']): Headers {
  const headers = new Headers()
  for (const [key, value] of Object.entries(raw)) {
    if (value) headers.append(key, Array.isArray(value) ? value.join(', ') : value)
  }
  return headers
}
