import { describe, expect, it } from 'vitest'
import { OrgMetadataSchema, parseOrgMetadata } from './organization.js'

describe('orgMetadataSchema', () => {
  it('should accept valid metadata', () => {
    const result = OrgMetadataSchema.safeParse({ maxProjects: 5, personal: true })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ maxProjects: 5, personal: true })
  })

  it('should accept empty object', () => {
    const result = OrgMetadataSchema.safeParse({})
    expect(result.success).toBe(true)
    expect(result.data).toEqual({})
  })

  it('should accept null maxProjects', () => {
    const result = OrgMetadataSchema.safeParse({ maxProjects: null })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ maxProjects: null })
  })

  it('should reject negative maxProjects', () => {
    const result = OrgMetadataSchema.safeParse({ maxProjects: -1 })
    expect(result.success).toBe(false)
  })

  it('should passthrough unknown keys', () => {
    const result = OrgMetadataSchema.safeParse({ maxProjects: 3, customField: 'hello' })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ maxProjects: 3, customField: 'hello' })
  })
})

describe('parseOrgMetadata', () => {
  it('should return empty object for null', () => {
    expect(parseOrgMetadata(null)).toEqual({})
  })

  it('should return empty object for undefined', () => {
    expect(parseOrgMetadata(undefined)).toEqual({})
  })

  it('should return empty object for empty string', () => {
    expect(parseOrgMetadata('')).toEqual({})
  })

  it('should return empty object for invalid JSON', () => {
    expect(parseOrgMetadata('not-json')).toEqual({})
  })

  it('should parse valid metadata string', () => {
    expect(parseOrgMetadata('{"maxProjects":10,"personal":true}')).toEqual({
      maxProjects: 10,
      personal: true,
    })
  })

  it('should return empty object when schema validation fails', () => {
    expect(parseOrgMetadata('{"maxProjects":-5}')).toEqual({})
  })

  it('should preserve passthrough fields', () => {
    expect(parseOrgMetadata('{"maxProjects":2,"custom":"val"}')).toEqual({
      maxProjects: 2,
      custom: 'val',
    })
  })
})
