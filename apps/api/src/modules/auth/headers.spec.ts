import type { FastifyRequest } from 'fastify'
import { toHeaders } from './headers.js'

describe('headers - toHeaders', () => {
  it('converts string header values', () => {
    const headers = toHeaders({
      'content-type': 'application/json',
      authorization: 'Bearer token',
    } as FastifyRequest['headers'])

    expect(headers.get('content-type')).toBe('application/json')
    expect(headers.get('authorization')).toBe('Bearer token')
  })

  it('joins array header values with ", "', () => {
    const headers = toHeaders({
      accept: ['text/html', 'application/json'],
    } as FastifyRequest['headers'])

    expect(headers.get('accept')).toBe('text/html, application/json')
  })

  it('skips headers whose value is undefined', () => {
    const headers = toHeaders({
      'x-custom': undefined,
      'content-type': 'application/json',
    } as FastifyRequest['headers'])

    expect(headers.has('x-custom')).toBe(false)
    expect(headers.get('content-type')).toBe('application/json')
  })

  it('returns empty Headers for an empty input object', () => {
    const headers = toHeaders({})
    expect([...headers.entries()]).toHaveLength(0)
  })
})
