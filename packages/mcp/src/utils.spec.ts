import { ApiError } from '@template-monorepo-ts/shared'
import { describe, expect, it } from 'vitest'
import { formatError, formatSuccess } from './utils.js'

describe('formatSuccess', () => {
  it('formats data as JSON text content', () => {
    const result = formatSuccess({ id: '1', name: 'Test' })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(JSON.parse(result.content[0].text)).toEqual({ id: '1', name: 'Test' })
  })

  it('formats arrays', () => {
    const result = formatSuccess([{ id: '1' }, { id: '2' }])

    expect(JSON.parse(result.content[0].text)).toHaveLength(2)
  })

  it('formats null', () => {
    const result = formatSuccess(null)

    expect(result.content[0].text).toBe('null')
  })

  it('does not set isError', () => {
    const result = formatSuccess({ ok: true })

    expect('isError' in result).toBe(false)
  })
})

describe('formatError', () => {
  it('formats ApiError with status and data', () => {
    const error = new ApiError(404, 'Not Found', { message: 'Project not found' })

    const result = formatError(error)

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('404')
    expect(result.content[0].text).toContain('Not Found')
    expect(result.content[0].text).toContain('Project not found')
  })

  it('formats ApiError without data', () => {
    const error = new ApiError(500, 'Internal Server Error')

    const result = formatError(error)

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('500')
    expect(result.content[0].text).toContain('Internal Server Error')
  })

  it('formats standard Error', () => {
    const error = new Error('Something went wrong')

    const result = formatError(error)

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('Something went wrong')
  })

  it('formats non-Error values', () => {
    const result = formatError('unexpected string error')

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('unexpected string error')
  })
})
