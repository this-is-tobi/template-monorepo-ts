import { describe, expect, it } from 'vitest'
import { ApiKeyMetadataSchema, parseApiKeyMetadata } from './apikey.js'

describe('apiKeyMetadataSchema', () => {
  it('should accept valid metadata with organizationId', () => {
    const result = ApiKeyMetadataSchema.safeParse({ organizationId: 'org-123' })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ organizationId: 'org-123' })
  })

  it('should accept empty object', () => {
    const result = ApiKeyMetadataSchema.safeParse({})
    expect(result.success).toBe(true)
    expect(result.data).toEqual({})
  })

  it('should passthrough unknown keys', () => {
    const result = ApiKeyMetadataSchema.safeParse({ organizationId: 'org-1', extra: 'data' })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ organizationId: 'org-1', extra: 'data' })
  })
})

describe('parseApiKeyMetadata', () => {
  it('should return empty object for null', () => {
    expect(parseApiKeyMetadata(null)).toEqual({})
  })

  it('should return empty object for undefined', () => {
    expect(parseApiKeyMetadata(undefined)).toEqual({})
  })

  it('should return empty object for invalid JSON', () => {
    expect(parseApiKeyMetadata('not-json')).toEqual({})
  })

  it('should parse valid metadata string', () => {
    expect(parseApiKeyMetadata('{"organizationId":"org-42"}')).toEqual({ organizationId: 'org-42' })
  })

  it('should preserve passthrough fields', () => {
    expect(parseApiKeyMetadata('{"organizationId":"org-1","note":"test"}')).toEqual({
      organizationId: 'org-1',
      note: 'test',
    })
  })
})
