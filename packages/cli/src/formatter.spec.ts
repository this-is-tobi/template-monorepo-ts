import { describe, expect, it, vi } from 'vitest'
import { formatJson, formatOutput, formatTable, printOutput } from './formatter.js'

describe('formatter', () => {
  describe('formatTable', () => {
    it('renders aligned columns with headers', () => {
      const data = [
        { id: '1', name: 'Alpha', status: 'active' },
        { id: '2', name: 'Beta Project', status: 'archived' },
      ]
      const result = formatTable(data)
      expect(result).toContain('ID')
      expect(result).toContain('NAME')
      expect(result).toContain('STATUS')
      expect(result).toContain('Alpha')
      expect(result).toContain('Beta Project')
      expect(result).toContain('archived')
    })

    it('returns "No results." for empty array', () => {
      expect(formatTable([])).toBe('No results.')
    })

    it('handles null and undefined values', () => {
      const data = [{ id: '1', name: null, desc: undefined }]
      const result = formatTable(data as Record<string, unknown>[])
      expect(result).toContain('ID')
      expect(result).toContain('1')
    })

    it('handles boolean and number values in cells', () => {
      const data = [{ active: true, count: 42 }]
      const result = formatTable(data as Record<string, unknown>[])
      expect(result).toContain('true')
      expect(result).toContain('42')
    })

    it('handles single-column data', () => {
      const data = [{ name: 'Alpha' }, { name: 'Beta' }]
      const result = formatTable(data)
      expect(result).toContain('NAME')
      expect(result).toContain('Alpha')
      expect(result).toContain('Beta')
    })

    it('stringifies object values in cells', () => {
      const data = [{ id: '1', meta: { key: 'val' } }]
      const result = formatTable(data as Record<string, unknown>[])
      expect(result).toContain('{"key":"val"}')
    })
  })

  describe('formatJson', () => {
    it('formats data as indented JSON', () => {
      const data = { id: '1', name: 'Test' }
      expect(formatJson(data)).toBe(JSON.stringify(data, null, 2))
    })

    it('formats arrays as JSON', () => {
      const data = [{ id: '1' }, { id: '2' }]
      expect(formatJson(data)).toBe(JSON.stringify(data, null, 2))
    })
  })

  describe('formatOutput', () => {
    it('delegates to formatJson for json format', () => {
      const data = { id: '1' }
      expect(formatOutput(data, 'json')).toBe(JSON.stringify(data, null, 2))
    })

    it('renders table for object in table format', () => {
      const data = { id: '1', name: 'Test' }
      const result = formatOutput(data, 'table')
      expect(result).toContain('ID')
      expect(result).toContain('NAME')
    })

    it('renders table for array of objects in table format', () => {
      const data = [{ id: '1' }, { id: '2' }]
      const result = formatOutput(data, 'table')
      expect(result).toContain('ID')
    })

    it('returns "No results." for empty array in table format', () => {
      expect(formatOutput([], 'table')).toBe('No results.')
    })

    it('renders primitives as string', () => {
      expect(formatOutput('hello', 'table')).toBe('hello')
      expect(formatOutput(42, 'table')).toBe('42')
    })

    it('renders array of primitives as newline-separated', () => {
      expect(formatOutput(['a', 'b', 'c'], 'table')).toBe('a\nb\nc')
    })
  })

  describe('printOutput', () => {
    it('writes formatted output to stdout', () => {
      const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
      printOutput({ id: '1' }, 'json')
      expect(writeSpy).toHaveBeenCalledWith(
        `${JSON.stringify({ id: '1' }, null, 2)}\n`,
      )
      writeSpy.mockRestore()
    })
  })
})
