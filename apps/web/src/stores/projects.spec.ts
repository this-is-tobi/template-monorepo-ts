import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProjectsStore } from './projects'

const mockGetAll = vi.fn()
const mockGetById = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('~/lib/api', () => ({
  apiClient: {
    projects: {
      getAll: (...args: unknown[]) => mockGetAll(...args),
      getById: (...args: unknown[]) => mockGetById(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}))

const mockProject = {
  id: '1',
  name: 'Test Project',
  description: 'A test project',
  ownerId: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('useProjectsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should start with empty state', () => {
    const store = useProjectsStore()
    expect(store.projects).toEqual([])
    expect(store.currentProject).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('fetchProjects', () => {
    it('should populate projects on success', async () => {
      mockGetAll.mockResolvedValue({ data: { data: [mockProject] } })
      const store = useProjectsStore()
      await store.fetchProjects()
      expect(store.projects).toEqual([mockProject])
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should set error on failure', async () => {
      mockGetAll.mockRejectedValue(new Error('Network error'))
      const store = useProjectsStore()
      await store.fetchProjects()
      expect(store.projects).toEqual([])
      expect(store.error).toBe('Network error')
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchProject', () => {
    it('should set currentProject on success', async () => {
      mockGetById.mockResolvedValue({ data: { data: mockProject } })
      const store = useProjectsStore()
      await store.fetchProject('1')
      expect(store.currentProject).toEqual(mockProject)
      expect(mockGetById).toHaveBeenCalledWith('1')
    })

    it('should set error on failure', async () => {
      mockGetById.mockRejectedValue(new Error('Not found'))
      const store = useProjectsStore()
      await store.fetchProject('999')
      expect(store.currentProject).toBeNull()
      expect(store.error).toBe('Not found')
    })
  })

  describe('createProject', () => {
    it('should add project to list on success', async () => {
      mockCreate.mockResolvedValue({ data: { data: mockProject } })
      const store = useProjectsStore()
      const result = await store.createProject({ name: 'Test Project', description: 'A test project' })
      expect(result).toEqual(mockProject)
      expect(store.projects).toContainEqual(mockProject)
    })

    it('should return null on failure', async () => {
      mockCreate.mockRejectedValue(new Error('Validation error'))
      const store = useProjectsStore()
      const result = await store.createProject({ name: 'Bad' })
      expect(result).toBeNull()
      expect(store.error).toBe('Validation error')
    })
  })

  describe('updateProject', () => {
    it('should update project in list and currentProject', async () => {
      const updated = { ...mockProject, name: 'Updated' }
      mockUpdate.mockResolvedValue({ data: { data: updated } })
      const store = useProjectsStore()
      store.projects = [mockProject]
      store.currentProject = mockProject
      const result = await store.updateProject('1', { name: 'Updated' })
      expect(result).toEqual(updated)
      expect(store.projects[0]).toEqual(updated)
      expect(store.currentProject).toEqual(updated)
    })

    it('should return null on failure', async () => {
      mockUpdate.mockRejectedValue(new Error('Update failed'))
      const store = useProjectsStore()
      const result = await store.updateProject('1', { name: 'Bad' })
      expect(result).toBeNull()
      expect(store.error).toBe('Update failed')
    })
  })

  describe('deleteProject', () => {
    it('should remove project from list', async () => {
      mockDelete.mockResolvedValue({ data: { message: 'Deleted' } })
      const store = useProjectsStore()
      store.projects = [mockProject]
      store.currentProject = mockProject
      const ok = await store.deleteProject('1')
      expect(ok).toBe(true)
      expect(store.projects).toEqual([])
      expect(store.currentProject).toBeNull()
    })

    it('should return false on failure', async () => {
      mockDelete.mockRejectedValue(new Error('Delete failed'))
      const store = useProjectsStore()
      const ok = await store.deleteProject('1')
      expect(ok).toBe(false)
      expect(store.error).toBe('Delete failed')
    })

    it('should not clear currentProject if different id', async () => {
      mockDelete.mockResolvedValue({ data: { message: 'Deleted' } })
      const other = { ...mockProject, id: '2', name: 'Other' }
      const store = useProjectsStore()
      store.projects = [mockProject, other]
      store.currentProject = other
      await store.deleteProject('1')
      expect(store.projects).toEqual([other])
      expect(store.currentProject).toEqual(other)
    })
  })
})
