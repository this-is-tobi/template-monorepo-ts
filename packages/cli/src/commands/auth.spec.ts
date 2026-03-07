import { ApiError } from '@template-monorepo-ts/shared'
import { runCommand } from 'citty'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config.js', () => ({
  resolveConfig: vi.fn(),
  loadConfig: vi.fn().mockResolvedValue({}),
  saveConfig: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../client.js', () => ({
  createClient: vi.fn(),
}))

vi.mock('../formatter.js', () => ({
  printOutput: vi.fn(),
}))

const { resolveConfig, loadConfig, saveConfig } = await import('../config.js')
const { createClient } = await import('../client.js')
const { printOutput } = await import('../formatter.js')
const { runLogin, runLogout, runWhoami } = await import('./auth.js')
const { default: authCommand } = await import('./auth.js')

describe('auth Commands', () => {
  const mockConfig = { serverUrl: 'http://localhost:3000', output: 'table' as const }
  const mockAuthClient = {
    auth: {
      signIn: vi.fn(),
      getSession: vi.fn(),
    },
  }
  const writeSpy = vi.fn().mockReturnValue(true)

  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockImplementation(writeSpy)
    vi.mocked(resolveConfig).mockResolvedValue(mockConfig)
    vi.mocked(loadConfig).mockResolvedValue({})
    vi.mocked(createClient).mockReturnValue(mockAuthClient as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  describe('runLogin', () => {
    it('stores API key when --key is provided', async () => {
      await runLogin({ key: 'my-api-key' })
      expect(saveConfig).toHaveBeenCalledWith({ apiKey: 'my-api-key' })
      expect(writeSpy).toHaveBeenCalledWith('API key saved to config.\n')
    })

    it('throws when neither email/password nor key provided', async () => {
      await expect(runLogin({})).rejects.toThrow('Provide --email and --password')
    })

    it('authenticates with email/password and stores token', async () => {
      mockAuthClient.auth.signIn.mockResolvedValue({
        data: { token: 'jwt-token-123' },
        status: 200,
        statusText: 'OK',
      })

      await runLogin({ email: 'user@test.com', password: 'pass', server: 'http://localhost:3000' })

      expect(mockAuthClient.auth.signIn).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'pass',
      })
      expect(saveConfig).toHaveBeenCalledWith(expect.objectContaining({ token: 'jwt-token-123' }))
    })

    it('throws on authentication failure', async () => {
      mockAuthClient.auth.signIn.mockRejectedValue(
        new ApiError(401, 'Unauthorized', { message: 'Invalid credentials' }),
      )

      await expect(
        runLogin({ email: 'user@test.com', password: 'wrong', server: 'http://localhost:3000' }),
      ).rejects.toThrow('Login failed: Invalid credentials')
    })

    it('falls back to statusText when ApiError data has no message', async () => {
      mockAuthClient.auth.signIn.mockRejectedValue(
        new ApiError(401, 'Unauthorized', null),
      )

      await expect(
        runLogin({ email: 'user@test.com', password: 'wrong', server: 'http://localhost:3000' }),
      ).rejects.toThrow('Login failed: Unauthorized')
    })

    it('throws when no token in response', async () => {
      mockAuthClient.auth.signIn.mockResolvedValue({
        data: { user: {} },
        status: 200,
        statusText: 'OK',
      })

      await expect(
        runLogin({ email: 'user@test.com', password: 'pass', server: 'http://localhost:3000' }),
      ).rejects.toThrow('no bearer token was returned')
    })

    it('re-throws non-ApiError errors', async () => {
      mockAuthClient.auth.signIn.mockRejectedValue(new Error('Network error'))

      await expect(
        runLogin({ email: 'user@test.com', password: 'pass', server: 'http://localhost:3000' }),
      ).rejects.toThrow('Network error')
    })
  })

  describe('runLogout', () => {
    it('clears token and apiKey from config', async () => {
      vi.mocked(loadConfig).mockResolvedValue({ serverUrl: 'http://localhost', token: 'tok', apiKey: 'key' })
      await runLogout()
      expect(saveConfig).toHaveBeenCalledWith({ serverUrl: 'http://localhost' })
      expect(writeSpy).toHaveBeenCalledWith('Logged out. Credentials removed from config.\n')
    })
  })

  describe('runWhoami', () => {
    it('fetches and displays session info', async () => {
      const session = { user: { id: 'u1', email: 'user@test.com', name: 'Test' }, session: { id: 's1', userId: 'u1' } }
      mockAuthClient.auth.getSession.mockResolvedValue({ data: session, status: 200, statusText: 'OK' })

      await runWhoami({})

      expect(mockAuthClient.auth.getSession).toHaveBeenCalled()
      expect(printOutput).toHaveBeenCalledWith(session, 'table')
    })

    it('throws when not authenticated', async () => {
      mockAuthClient.auth.getSession.mockRejectedValue(
        new ApiError(401, 'Unauthorized', null),
      )
      await expect(runWhoami({})).rejects.toThrow('Not authenticated')
    })

    it('re-throws non-ApiError errors', async () => {
      mockAuthClient.auth.getSession.mockRejectedValue(new Error('Network failure'))
      await expect(runWhoami({})).rejects.toThrow('Network failure')
    })
  })

  describe('subCommand dispatch', () => {
    it('routes login subcommand', async () => {
      mockAuthClient.auth.signIn.mockResolvedValue({ data: { token: 'tok' }, status: 200, statusText: 'OK' })
      await runCommand(authCommand as Parameters<typeof runCommand>[0], { rawArgs: ['login', '--email', 'u@test.com', '--password', 'pass'] })
      expect(mockAuthClient.auth.signIn).toHaveBeenCalled()
    })

    it('routes logout subcommand', async () => {
      await runCommand(authCommand as Parameters<typeof runCommand>[0], { rawArgs: ['logout'] })
      expect(saveConfig).toHaveBeenCalled()
    })

    it('routes whoami subcommand', async () => {
      mockAuthClient.auth.getSession.mockResolvedValue({ data: { user: {} }, status: 200, statusText: 'OK' })
      await runCommand(authCommand as Parameters<typeof runCommand>[0], { rawArgs: ['whoami'] })
      expect(mockAuthClient.auth.getSession).toHaveBeenCalled()
    })
  })
})
