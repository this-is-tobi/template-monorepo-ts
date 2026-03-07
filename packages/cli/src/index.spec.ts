import { describe, expect, it, vi } from 'vitest'

// Mock all dependencies to prevent side effects
vi.mock('./config.js', () => ({
  resolveConfig: vi.fn(),
  loadConfig: vi.fn().mockResolvedValue({}),
  saveConfig: vi.fn().mockResolvedValue(undefined),
  updateConfig: vi.fn().mockResolvedValue({}),
  deleteConfigKey: vi.fn().mockResolvedValue({}),
  getConfigPath: vi.fn().mockReturnValue('/home/user/.config/tmts/config.json'),
}))

vi.mock('./client.js', () => ({
  createClient: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  printOutput: vi.fn(),
}))

describe('cLI index', () => {
  it('exports main command with expected meta', async () => {
    const { default: authCommand } = await import('./commands/auth.js')
    const { default: configCommand } = await import('./commands/config.js')
    const { default: projectsCommand } = await import('./commands/projects.js')
    const { default: systemCommand } = await import('./commands/system.js')

    const authMeta = authCommand.meta as Record<string, unknown>
    const configMeta = configCommand.meta as Record<string, unknown>
    const projectsMeta = projectsCommand.meta as Record<string, unknown>
    const systemMeta = systemCommand.meta as Record<string, unknown>

    expect(authMeta?.name).toBe('auth')
    expect(configMeta?.name).toBe('config')
    expect(projectsMeta?.name).toBe('projects')
    expect(systemMeta?.name).toBe('system')
  })

  it('auth command has expected sub commands', async () => {
    const { default: authCommand } = await import('./commands/auth.js')
    const subs = authCommand.subCommands as Record<string, unknown>

    expect(subs).toBeDefined()
    expect(Object.keys(subs!)).toEqual(expect.arrayContaining(['login', 'logout', 'whoami']))
  })

  it('config command has expected sub commands', async () => {
    const { default: configCommand } = await import('./commands/config.js')
    const subs = configCommand.subCommands as Record<string, unknown>

    expect(subs).toBeDefined()
    expect(Object.keys(subs!)).toEqual(expect.arrayContaining(['set', 'get', 'list', 'delete']))
  })

  it('projects command has expected sub commands', async () => {
    const { default: projectsCommand } = await import('./commands/projects.js')
    const subs = projectsCommand.subCommands as Record<string, unknown>

    expect(subs).toBeDefined()
    expect(Object.keys(subs!)).toEqual(expect.arrayContaining(['list', 'get', 'create', 'update', 'delete']))
  })

  it('system command has expected sub commands', async () => {
    const { default: systemCommand } = await import('./commands/system.js')
    const subs = systemCommand.subCommands as Record<string, unknown>

    expect(subs).toBeDefined()
    expect(Object.keys(subs!)).toEqual(expect.arrayContaining(['version', 'health', 'ready', 'live']))
  })
})
