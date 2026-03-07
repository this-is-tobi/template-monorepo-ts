import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteConfigKey, getConfigDir, getConfigPath, loadConfig, resolveConfig, saveConfig, updateConfig } from './config.js'

vi.mock('./fs.js', () => ({
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn().mockResolvedValue(undefined),
}))

const { readJsonFile, writeJsonFile } = await import('./fs.js')

describe('cLI Config', () => {
  const originalHome = process.env.HOME

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.HOME = '/tmp/test-home'
    delete process.env.TMTS_SERVER_URL
    delete process.env.TMTS_TOKEN
    delete process.env.TMTS_API_KEY
    delete process.env.TMTS_OUTPUT
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env.HOME = originalHome
  })

  describe('getConfigDir', () => {
    it('returns XDG-compliant config directory', () => {
      expect(getConfigDir()).toBe('/tmp/test-home/.config/tmts')
    })

    it('falls back to USERPROFILE when HOME is unset', () => {
      delete process.env.HOME
      process.env.USERPROFILE = '/tmp/win-home'
      expect(getConfigDir()).toBe('/tmp/win-home/.config/tmts')
      delete process.env.USERPROFILE
    })

    it('falls back to empty string when no home env vars', () => {
      delete process.env.HOME
      delete process.env.USERPROFILE
      expect(getConfigDir()).toBe('.config/tmts')
    })
  })

  describe('getConfigPath', () => {
    it('returns config file path', () => {
      expect(getConfigPath()).toBe('/tmp/test-home/.config/tmts/config.json')
    })
  })

  describe('loadConfig', () => {
    it('returns empty config when file does not exist', async () => {
      vi.mocked(readJsonFile).mockResolvedValue(null)
      expect(await loadConfig()).toEqual({})
    })

    it('parses valid config file', async () => {
      vi.mocked(readJsonFile).mockResolvedValue({
        serverUrl: 'http://localhost:3000',
        output: 'json',
      })
      expect(await loadConfig()).toEqual({
        serverUrl: 'http://localhost:3000',
        output: 'json',
      })
    })

    it('returns empty config for non-object data', async () => {
      vi.mocked(readJsonFile).mockResolvedValue('string')
      expect(await loadConfig()).toEqual({})
    })

    it('returns empty config for array data', async () => {
      vi.mocked(readJsonFile).mockResolvedValue([1, 2])
      expect(await loadConfig()).toEqual({})
    })
  })

  describe('saveConfig', () => {
    it('writes config via writeJsonFile', async () => {
      await saveConfig({ serverUrl: 'http://localhost:3000' })
      expect(writeJsonFile).toHaveBeenCalledWith(
        '/tmp/test-home/.config/tmts/config.json',
        { serverUrl: 'http://localhost:3000' },
      )
    })
  })

  describe('updateConfig', () => {
    it('merges updates with existing config', async () => {
      vi.mocked(readJsonFile).mockResolvedValue({
        serverUrl: 'http://localhost:3000',
        output: 'table',
      })
      const result = await updateConfig({ output: 'json' })
      expect(result).toEqual({ serverUrl: 'http://localhost:3000', output: 'json' })
    })
  })

  describe('deleteConfigKey', () => {
    it('removes a key from config', async () => {
      vi.mocked(readJsonFile).mockResolvedValue({
        serverUrl: 'http://localhost:3000',
        token: 'secret',
      })
      const result = await deleteConfigKey('token')
      expect(result).toEqual({ serverUrl: 'http://localhost:3000' })
    })
  })

  describe('resolveConfig', () => {
    it('throws when no server URL is configured', async () => {
      vi.mocked(readJsonFile).mockResolvedValue(null)
      await expect(resolveConfig({})).rejects.toThrow('No server URL configured')
    })

    it('resolves from CLI args with highest priority', async () => {
      vi.mocked(readJsonFile).mockResolvedValue({
        serverUrl: 'http://from-file',
        token: 'file-token',
      })
      process.env.TMTS_SERVER_URL = 'http://from-env'
      process.env.TMTS_TOKEN = 'env-token'

      const result = await resolveConfig({
        server: 'http://from-flag',
        token: 'flag-token',
        output: 'json',
      })

      expect(result.serverUrl).toBe('http://from-flag')
      expect(result.token).toBe('flag-token')
      expect(result.output).toBe('json')
    })

    it('resolves from env vars when no CLI args', async () => {
      vi.mocked(readJsonFile).mockResolvedValue(null)
      process.env.TMTS_SERVER_URL = 'http://from-env'
      process.env.TMTS_TOKEN = 'env-token'
      process.env.TMTS_API_KEY = 'env-key'
      process.env.TMTS_OUTPUT = 'json'

      const result = await resolveConfig({})

      expect(result.serverUrl).toBe('http://from-env')
      expect(result.token).toBe('env-token')
      expect(result.apiKey).toBe('env-key')
      expect(result.output).toBe('json')
    })

    it('resolves from config file when no args or env', async () => {
      vi.mocked(readJsonFile).mockResolvedValue({
        serverUrl: 'http://from-file',
        token: 'file-token',
        apiKey: 'file-key',
        output: 'json',
      })

      const result = await resolveConfig({})

      expect(result.serverUrl).toBe('http://from-file')
      expect(result.token).toBe('file-token')
      expect(result.apiKey).toBe('file-key')
      expect(result.output).toBe('json')
    })

    it('defaults output to table', async () => {
      vi.mocked(readJsonFile).mockResolvedValue(null)
      const result = await resolveConfig({ server: 'http://localhost' })
      expect(result.output).toBe('table')
    })

    it('ignores invalid output format from args', async () => {
      vi.mocked(readJsonFile).mockResolvedValue(null)
      const result = await resolveConfig({ server: 'http://localhost', output: 'xml' })
      expect(result.output).toBe('table')
    })

    it('resolves API key from args', async () => {
      vi.mocked(readJsonFile).mockResolvedValue(null)
      const result = await resolveConfig({ server: 'http://localhost', key: 'my-key' })
      expect(result.apiKey).toBe('my-key')
    })
  })
})
