import { beforeAll, describe, expect, it, vi } from 'vitest'

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

interface Command { meta?: unknown, subCommands?: unknown }

let authCommand: Command
let configCommand: Command
let projectsCommand: Command
let systemCommand: Command

/**
 * Loaded once, with a timeout of its own.
 *
 * Importing a command pulls in `@template-monorepo-ts/shared` from source, and
 * Vite transforms the whole package on the way. That is comfortably over the
 * default 5s per-test timeout when the rest of the monorepo is transforming in
 * parallel, so paying it inside the first `it()` made these tests fail
 * whenever something in `shared` changed. The assertions below are about
 * static metadata and should not be timing-sensitive at all.
 */
beforeAll(async () => {
  ;[authCommand, configCommand, projectsCommand, systemCommand] = await Promise.all([
    import('./commands/auth.js').then(m => m.default as Command),
    import('./commands/config.js').then(m => m.default as Command),
    import('./commands/projects.js').then(m => m.default as Command),
    import('./commands/system.js').then(m => m.default as Command),
  ])
}, 60_000)

/** Sub-command names of a loaded command. */
function subCommandsOf(command: Command): string[] {
  const subs = command.subCommands as Record<string, unknown> | undefined
  expect(subs).toBeDefined()
  return Object.keys(subs!)
}

describe('cLI index', () => {
  it('exports main command with expected meta', () => {
    expect((authCommand.meta as Record<string, unknown>)?.name).toBe('auth')
    expect((configCommand.meta as Record<string, unknown>)?.name).toBe('config')
    expect((projectsCommand.meta as Record<string, unknown>)?.name).toBe('projects')
    expect((systemCommand.meta as Record<string, unknown>)?.name).toBe('system')
  })

  it('auth command has expected sub commands', () => {
    expect(subCommandsOf(authCommand)).toEqual(expect.arrayContaining(['login', 'logout', 'whoami']))
  })

  it('config command has expected sub commands', () => {
    expect(subCommandsOf(configCommand)).toEqual(expect.arrayContaining(['set', 'get', 'list', 'delete']))
  })

  it('projects command has expected sub commands', () => {
    expect(subCommandsOf(projectsCommand)).toEqual(expect.arrayContaining(['list', 'get', 'create', 'update', 'delete']))
  })

  it('system command has expected sub commands', () => {
    expect(subCommandsOf(systemCommand)).toEqual(expect.arrayContaining(['version', 'health', 'ready', 'live']))
  })
})
