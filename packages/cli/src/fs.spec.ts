import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readJsonFile, writeJsonFile } from './fs.js'

describe('fs', () => {
  let dir: string

  beforeEach(async () => {
    dir = join(tmpdir(), `cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    await mkdir(dir, { recursive: true })
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  describe('readJsonFile', () => {
    it('returns null when the file does not exist', async () => {
      const result = await readJsonFile(join(dir, 'missing.json'))
      expect(result).toBeNull()
    })

    it('returns parsed JSON when the file exists', async () => {
      const file = join(dir, 'data.json')
      await writeFile(file, JSON.stringify({ key: 'value' }))

      const result = await readJsonFile<{ key: string }>(file)
      expect(result).toEqual({ key: 'value' })
    })

    it('returns null for invalid JSON', async () => {
      const file = join(dir, 'bad.json')
      await writeFile(file, 'not-valid-json{{{')

      const result = await readJsonFile(file)
      expect(result).toBeNull()
    })
  })

  describe('writeJsonFile', () => {
    it('creates parent directories and writes JSON', async () => {
      const file = join(dir, 'nested', 'sub', 'data.json')
      await writeJsonFile(file, { hello: 'world' })

      const written = await readJsonFile<{ hello: string }>(file)
      expect(written).toEqual({ hello: 'world' })
    })

    it('writes correctly formatted JSON with trailing newline', async () => {
      const file = join(dir, 'formatted.json')
      await writeJsonFile(file, { a: 1 })

      const raw = await readFile(file, 'utf8')
      expect(raw).toBe(`${JSON.stringify({ a: 1 }, null, 2)}\n`)
    })
  })
})
