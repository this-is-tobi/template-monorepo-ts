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
const { runList, runGet, runCreate, runUpdate, runDelete } = await import('./projects.js')
const { default: projectsCommand } = await import('./projects.js')

describe('project Commands', () => {
  const mockConfig = { serverUrl: 'http://localhost:3000', output: 'table' as const }
  const mockProject = { id: 'p1', name: 'Test', description: 'Desc' }
  const mockClient = {
    projects: {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.mocked(resolveConfig).mockResolvedValue(mockConfig)
    vi.mocked(createClient).mockReturnValue(mockClient as never)
    mockClient.projects.getAll.mockResolvedValue({ data: [mockProject] })
    mockClient.projects.getById.mockResolvedValue({ data: mockProject })
    mockClient.projects.create.mockResolvedValue({ data: mockProject })
    mockClient.projects.update.mockResolvedValue({ data: { ...mockProject, name: 'Updated' } })
    mockClient.projects.delete.mockResolvedValue({ data: undefined })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('runList', () => {
    it('lists all projects', async () => {
      await runList({})
      expect(mockClient.projects.getAll).toHaveBeenCalled()
      expect(printOutput).toHaveBeenCalledWith([mockProject], 'table')
    })
  })

  describe('runGet', () => {
    it('gets a project by ID', async () => {
      await runGet({ id: 'p1' })
      expect(mockClient.projects.getById).toHaveBeenCalledWith('p1')
      expect(printOutput).toHaveBeenCalledWith(mockProject, 'table')
    })
  })

  describe('runCreate', () => {
    it('creates a project with name and description', async () => {
      await runCreate({ name: 'Test', description: 'Desc' })
      expect(mockClient.projects.create).toHaveBeenCalledWith({ name: 'Test', description: 'Desc' })
      expect(printOutput).toHaveBeenCalledWith(mockProject, 'table')
    })

    it('creates a project with name only', async () => {
      await runCreate({ name: 'Test' })
      expect(mockClient.projects.create).toHaveBeenCalledWith({ name: 'Test' })
    })
  })

  describe('runUpdate', () => {
    it('updates a project name', async () => {
      await runUpdate({ id: 'p1', name: 'Updated' })
      expect(mockClient.projects.update).toHaveBeenCalledWith('p1', { name: 'Updated' })
    })

    it('updates a project description', async () => {
      await runUpdate({ id: 'p1', description: 'New desc' })
      expect(mockClient.projects.update).toHaveBeenCalledWith('p1', { description: 'New desc' })
    })

    it('updates both name and description', async () => {
      await runUpdate({ id: 'p1', name: 'New Name', description: 'New desc' })
      expect(mockClient.projects.update).toHaveBeenCalledWith('p1', { name: 'New Name', description: 'New desc' })
      expect(printOutput).toHaveBeenCalledWith({ ...mockProject, name: 'Updated' }, 'table')
    })
  })

  describe('runDelete', () => {
    it('deletes a project and prints confirmation', async () => {
      await runDelete({ id: 'p1' })
      expect(mockClient.projects.delete).toHaveBeenCalledWith('p1')
      expect(printOutput).toHaveBeenCalledWith({ message: 'Project p1 deleted.' }, 'table')
    })
  })

  describe('subCommand dispatch', () => {
    it('routes list subcommand', async () => {
      await runCommand(projectsCommand as Parameters<typeof runCommand>[0], { rawArgs: ['list'] })
      expect(mockClient.projects.getAll).toHaveBeenCalled()
    })

    it('routes get subcommand', async () => {
      await runCommand(projectsCommand as Parameters<typeof runCommand>[0], { rawArgs: ['get', 'p1'] })
      expect(mockClient.projects.getById).toHaveBeenCalledWith('p1')
    })

    it('routes create subcommand', async () => {
      await runCommand(projectsCommand as Parameters<typeof runCommand>[0], { rawArgs: ['create', '--name', 'Test'] })
      expect(mockClient.projects.create).toHaveBeenCalledWith({ name: 'Test' })
    })

    it('routes update subcommand', async () => {
      await runCommand(projectsCommand as Parameters<typeof runCommand>[0], { rawArgs: ['update', 'p1', '--name', 'Updated'] })
      expect(mockClient.projects.update).toHaveBeenCalledWith('p1', { name: 'Updated' })
    })

    it('routes delete subcommand', async () => {
      await runCommand(projectsCommand as Parameters<typeof runCommand>[0], { rawArgs: ['delete', 'p1'] })
      expect(mockClient.projects.delete).toHaveBeenCalledWith('p1')
    })
  })
})
