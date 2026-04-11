import { describe, expect, it } from 'vitest'
import { ApiKeyMetadataSchema, parseApiKeyMetadata } from './apikey.js'

describe('apiKeyMetadataSchema', () => {
  it('should accept valid metadata with organizationIds', () => {
    const result = ApiKeyMetadataSchema.safeParse({ organizationIds: ['org-123'] })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ organizationIds: ['org-123'] })
  })

  it('should accept valid metadata with projectIds', () => {
    const result = ApiKeyMetadataSchema.safeParse({ projectIds: ['proj-1', 'proj-2'] })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ projectIds: ['proj-1', 'proj-2'] })
  })

  it('should accept both scopes together', () => {
    const result = ApiKeyMetadataSchema.safeParse({ organizationIds: ['org-1'], projectIds: ['proj-1'] })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ organizationIds: ['org-1'], projectIds: ['proj-1'] })
  })

  it('should accept empty arrays (deny-all)', () => {
    const result = ApiKeyMetadataSchema.safeParse({ organizationIds: [], projectIds: [] })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ organizationIds: [], projectIds: [] })
  })

  it('should accept empty object', () => {
    const result = ApiKeyMetadataSchema.safeParse({})
    expect(result.success).toBe(true)
    expect(result.data).toEqual({})
  })

  it('should strip unknown keys', () => {
    const result = ApiKeyMetadataSchema.safeParse({ organizationIds: ['org-1'], extra: 'data' })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ organizationIds: ['org-1'] })
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

  it('should parse valid metadata string with organizationIds', () => {
    expect(parseApiKeyMetadata('{"organizationIds":["org-42"]}')).toEqual({ organizationIds: ['org-42'] })
  })

  it('should parse valid metadata string with projectIds', () => {
    expect(parseApiKeyMetadata('{"projectIds":["proj-1"]}')).toEqual({ projectIds: ['proj-1'] })
  })

  it('should strip unknown fields from parsed metadata', () => {
    expect(parseApiKeyMetadata('{"organizationIds":["org-1"],"note":"test"}')).toEqual({
      organizationIds: ['org-1'],
    })
  })

  it('should parse already-parsed object (BetterAuth verifyApiKey)', () => {
    expect(parseApiKeyMetadata({ projectIds: ['proj-1'] } as unknown as string)).toEqual({ projectIds: ['proj-1'] })
  })

  it('should parse already-parsed object with organizationIds', () => {
    expect(parseApiKeyMetadata({ organizationIds: ['org-1', 'org-2'] } as unknown as string)).toEqual({ organizationIds: ['org-1', 'org-2'] })
  })
})
