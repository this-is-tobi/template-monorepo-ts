import { runCommand } from 'citty'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config.js', () => ({
  loadConfig: vi.fn(),
  updateConfig: vi.fn().mockResolvedValue(undefined),
  deleteConfigKey: vi.fn().mockResolvedValue(undefined),
  getConfigPath: vi.fn().mockReturnValue('/home/user/.config/tmts/config.json'),
}))

const { loadConfig, updateConfig, deleteConfigKey } = await import('../config.js')
const { runConfigSet, runConfigGet, runConfigList, runConfigDelete } = await import('./config.js')
const { default: configCommand } = await import('./config.js')

describe('config Commands', () => {
  const writeSpy = vi.fn().mockReturnValue(true)

  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockImplementation(writeSpy)
    vi.mocked(loadConfig).mockResolvedValue({})
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  describe('runConfigSet', () => {
    it('sets a valid config key', async () => {
      await runConfigSet('serverUrl', 'http://localhost:3000')
      expect(updateConfig).toHaveBeenCalledWith({ serverUrl: 'http://localhost:3000' })
      expect(writeSpy).toHaveBeenCalledWith('Set serverUrl = http://localhost:3000\n')
    })

    it('throws for unknown config key', async () => {
      await expect(runConfigSet('unknown', 'value')).rejects.toThrow('Unknown config key: unknown')
    })
  })

  describe('runConfigGet', () => {
    it('prints a config value', async () => {
      vi.mocked(loadConfig).mockResolvedValue({ serverUrl: 'http://localhost:3000' })
      await runConfigGet('serverUrl')
      expect(writeSpy).toHaveBeenCalledWith('http://localhost:3000\n')
    })

    it('prints empty string for unset key', async () => {
      await runConfigGet('serverUrl')
      expect(writeSpy).toHaveBeenCalledWith('\n')
    })

    it('throws for unknown config key', async () => {
      await expect(runConfigGet('unknown')).rejects.toThrow('Unknown config key: unknown')
    })
  })

  describe('runConfigList', () => {
    it('prints all config values', async () => {
      vi.mocked(loadConfig).mockResolvedValue({ serverUrl: 'http://localhost', output: 'json' })
      await runConfigList()
      expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('Config file:'))
      expect(writeSpy).toHaveBeenCalledWith('serverUrl = http://localhost\n')
      expect(writeSpy).toHaveBeenCalledWith('output = json\n')
    })

    it('prints (empty) for empty config', async () => {
      await runConfigList()
      expect(writeSpy).toHaveBeenCalledWith('(empty)\n')
    })

    it('masks token and apiKey values', async () => {
      vi.mocked(loadConfig).mockResolvedValue({ token: 'super-secret-token-123456' })
      await runConfigList()
      expect(writeSpy).toHaveBeenCalledWith('token = super-se...\n')
    })
  })

  describe('runConfigDelete', () => {
    it('deletes a config key', async () => {
      await runConfigDelete('token')
      expect(deleteConfigKey).toHaveBeenCalledWith('token')
      expect(writeSpy).toHaveBeenCalledWith('Deleted token\n')
    })

    it('throws for unknown config key', async () => {
      await expect(runConfigDelete('unknown')).rejects.toThrow('Unknown config key: unknown')
    })
  })

  describe('subCommand dispatch', () => {
    it('routes set subcommand', async () => {
      await runCommand(configCommand as Parameters<typeof runCommand>[0], { rawArgs: ['set', 'serverUrl', 'http://localhost'] })
      expect(updateConfig).toHaveBeenCalledWith({ serverUrl: 'http://localhost' })
    })

    it('routes get subcommand', async () => {
      vi.mocked(loadConfig).mockResolvedValue({ serverUrl: 'http://localhost' })
      await runCommand(configCommand as Parameters<typeof runCommand>[0], { rawArgs: ['get', 'serverUrl'] })
      expect(loadConfig).toHaveBeenCalled()
    })

    it('routes list subcommand', async () => {
      await runCommand(configCommand as Parameters<typeof runCommand>[0], { rawArgs: ['list'] })
      expect(loadConfig).toHaveBeenCalled()
    })

    it('routes delete subcommand', async () => {
      await runCommand(configCommand as Parameters<typeof runCommand>[0], { rawArgs: ['delete', 'token'] })
      expect(deleteConfigKey).toHaveBeenCalledWith('token')
    })
  })
})
