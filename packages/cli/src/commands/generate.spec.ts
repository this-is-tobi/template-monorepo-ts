import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildResourceFiles, writeResource } from './generate.js'

describe('buildResourceFiles', () => {
  it('produces the five canonical resource files', () => {
    const files = buildResourceFiles('foo')
    expect(Object.keys(files).sort()).toStrictEqual(
      ['business.ts', 'constants.ts', 'index.ts', 'queries.ts', 'router.ts'],
    )
  })

  it('substitutes the resource name in identifiers (camelCase + PascalCase)', () => {
    const files = buildResourceFiles('audit-export')
    expect(files['router.ts']).toContain('export function getAuditExportRouter()')
    expect(files['constants.ts']).toContain('auditExportMessages')
    expect(files['index.ts']).toContain('export * from \'./router.js\'')
  })

  it('rejects names that are not kebab-case', () => {
    expect(() => buildResourceFiles('FooBar')).toThrow(/invalid resource name/i)
    expect(() => buildResourceFiles('foo_bar')).toThrow(/invalid resource name/i)
    expect(() => buildResourceFiles('1foo')).toThrow(/invalid resource name/i)
  })
})

describe('writeResource', () => {
  it('writes all files into a fresh directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tmts-gen-'))
    const target = await writeResource('tickets', root, false)

    const entries = await readdir(target)
    expect(entries.sort()).toStrictEqual(['business.ts', 'constants.ts', 'index.ts', 'queries.ts', 'router.ts'])

    const router = await readFile(join(target, 'router.ts'), 'utf8')
    expect(router).toContain('getTicketsRouter')
  })

  it('refuses to overwrite a non-empty directory unless force=true', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tmts-gen-'))
    const target = join(root, 'foo')
    // Pre-populate the target directory.
    await (await import('node:fs/promises')).mkdir(target, { recursive: true })
    await writeFile(join(target, 'placeholder.ts'), '// existing\n', 'utf8')

    await expect(writeResource('foo', root, false)).rejects.toThrow(/not empty/i)

    // With force, the call succeeds and writes alongside the placeholder.
    await writeResource('foo', root, true)
    const entries = await readdir(target)
    expect(entries).toContain('router.ts')
    expect(entries).toContain('placeholder.ts')
  })
})
