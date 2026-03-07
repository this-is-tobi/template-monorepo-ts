import { runCommand } from 'citty'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config.js', () => ({
  resolveConfig: vi.fn(),
  loadConfig: vi.fn().mockResolvedValue({}),
}))

vi.mock('../client.js', () => ({
  createClient: vi.fn(),
}))

vi.mock('../formatter.js', () => ({
  printOutput: vi.fn(),
}))

const { resolveConfig } = await import('../config.js')
const { createClient } = await import('../client.js')
const { printOutput } = await import('../formatter.js')
const { runVersion, runHealth, runReady, runLive } = await import('./system.js')
const { default: systemCommand } = await import('./system.js')

describe('system Commands', () => {
  const mockConfig = { serverUrl: 'http://localhost:3000', output: 'table' as const }
  const mockClient = {
    system: {
      getVersion: vi.fn(),
      getHealth: vi.fn(),
      getReady: vi.fn(),
      getLive: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.mocked(resolveConfig).mockResolvedValue(mockConfig)
    vi.mocked(createClient).mockReturnValue(mockClient as never)
    mockClient.system.getVersion.mockResolvedValue({ data: { version: '1.0.0' } })
    mockClient.system.getHealth.mockResolvedValue({ data: { status: 'ok' } })
    mockClient.system.getReady.mockResolvedValue({ data: { status: 'ok' } })
    mockClient.system.getLive.mockResolvedValue({ data: { status: 'ok' } })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('runVersion', () => {
    it('resolves config, calls getVersion, and prints output', async () => {
      await runVersion({ server: 'http://localhost:3000' })

      expect(resolveConfig).toHaveBeenCalledWith({ server: 'http://localhost:3000' })
      expect(createClient).toHaveBeenCalledWith(mockConfig)
      expect(mockClient.system.getVersion).toHaveBeenCalled()
      expect(printOutput).toHaveBeenCalledWith({ version: '1.0.0' }, 'table')
    })
  })

  describe('runHealth', () => {
    it('resolves config, calls getHealth, and prints output', async () => {
      await runHealth({})

      expect(mockClient.system.getHealth).toHaveBeenCalled()
      expect(printOutput).toHaveBeenCalledWith({ status: 'ok' }, 'table')
    })
  })

  describe('runReady', () => {
    it('resolves config, calls getReady, and prints output', async () => {
      await runReady({})

      expect(mockClient.system.getReady).toHaveBeenCalled()
      expect(printOutput).toHaveBeenCalledWith({ status: 'ok' }, 'table')
    })
  })

  describe('runLive', () => {
    it('resolves config, calls getLive, and prints output', async () => {
      await runLive({})

      expect(mockClient.system.getLive).toHaveBeenCalled()
      expect(printOutput).toHaveBeenCalledWith({ status: 'ok' }, 'table')
    })
  })

  describe('subCommand dispatch', () => {
    it('routes version subcommand', async () => {
      await runCommand(systemCommand as Parameters<typeof runCommand>[0], { rawArgs: ['version'] })
      expect(mockClient.system.getVersion).toHaveBeenCalled()
    })

    it('routes health subcommand', async () => {
      await runCommand(systemCommand as Parameters<typeof runCommand>[0], { rawArgs: ['health'] })
      expect(mockClient.system.getHealth).toHaveBeenCalled()
    })

    it('routes ready subcommand', async () => {
      await runCommand(systemCommand as Parameters<typeof runCommand>[0], { rawArgs: ['ready'] })
      expect(mockClient.system.getReady).toHaveBeenCalled()
    })

    it('routes live subcommand', async () => {
      await runCommand(systemCommand as Parameters<typeof runCommand>[0], { rawArgs: ['live'] })
      expect(mockClient.system.getLive).toHaveBeenCalled()
    })
  })
})
