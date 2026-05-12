import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProjectsStore } from './projects'

const mockGetAll = vi.fn()
const mockGetById = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockGetMembers = vi.fn()
const mockAddMember = vi.fn()
const mockUpdateMember = vi.fn()
const mockRemoveMember = vi.fn()

vi.mock('~/lib/api', () => ({
  apiClient: {
    projects: {
      getAll: (...args: unknown[]) => mockGetAll(...args),
      getById: (...args: unknown[]) => mockGetById(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      getMembers: (...args: unknown[]) => mockGetMembers(...args),
      addMember: (...args: unknown[]) => mockAddMember(...args),
      updateMember: (...args: unknown[]) => mockUpdateMember(...args),
      removeMember: (...args: unknown[]) => mockRemoveMember(...args),
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

const mockMember = {
  id: 'member-1',
  projectId: '1',
  userId: 'user-2',
  role: 'member',
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

  describe('fetchMembers', () => {
    it('should populate members on success', async () => {
      mockGetMembers.mockResolvedValue({ data: { data: [mockMember] } })
      const store = useProjectsStore()
      await store.fetchMembers('1')
      expect(store.members).toEqual([mockMember])
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(mockGetMembers).toHaveBeenCalledWith('1', undefined)
    })

    it('should set error on failure', async () => {
      mockGetMembers.mockRejectedValue(new Error('Forbidden'))
      const store = useProjectsStore()
      await store.fetchMembers('1')
      expect(store.members).toEqual([])
      expect(store.error).toBe('Forbidden')
    })
  })

  describe('addMember', () => {
    it('should add member and re-fetch members on success', async () => {
      mockAddMember.mockResolvedValue({ data: { data: mockMember } })
      mockGetMembers.mockResolvedValue({ data: { data: [mockMember] } })
      const store = useProjectsStore()
      const ok = await store.addMember('1', { email: 'user2@test.com', role: 'member' })
      expect(ok).toBe(true)
      expect(mockAddMember).toHaveBeenCalledWith('1', { email: 'user2@test.com', role: 'member' })
      expect(store.members).toEqual([mockMember])
    })

    it('should return false on failure', async () => {
      mockAddMember.mockRejectedValue(new Error('Already exists'))
      const store = useProjectsStore()
      const ok = await store.addMember('1', { email: 'user2@test.com', role: 'member' })
      expect(ok).toBe(false)
      expect(store.error).toBe('Already exists')
    })
  })

  describe('updateMember', () => {
    it('should update member and re-fetch members on success', async () => {
      const updated = { ...mockMember, role: 'admin' }
      mockUpdateMember.mockResolvedValue({ data: { data: updated } })
      mockGetMembers.mockResolvedValue({ data: { data: [updated] } })
      const store = useProjectsStore()
      const ok = await store.updateMember('1', 'member-1', { role: 'admin' })
      expect(ok).toBe(true)
      expect(mockUpdateMember).toHaveBeenCalledWith('1', 'member-1', { role: 'admin' })
      expect(store.members).toEqual([updated])
    })

    it('should return false on failure', async () => {
      mockUpdateMember.mockRejectedValue(new Error('Update failed'))
      const store = useProjectsStore()
      const ok = await store.updateMember('1', 'member-1', { role: 'admin' })
      expect(ok).toBe(false)
      expect(store.error).toBe('Update failed')
    })
  })

  describe('removeMember', () => {
    it('should remove member from local state on success', async () => {
      mockRemoveMember.mockResolvedValue({ data: { message: 'Removed' } })
      const store = useProjectsStore()
      store.members = [mockMember]
      const ok = await store.removeMember('1', 'member-1')
      expect(ok).toBe(true)
      expect(store.members).toEqual([])
      expect(mockRemoveMember).toHaveBeenCalledWith('1', 'member-1')
    })

    it('should return false on failure', async () => {
      mockRemoveMember.mockRejectedValue(new Error('Remove failed'))
      const store = useProjectsStore()
      const ok = await store.removeMember('1', 'member-1')
      expect(ok).toBe(false)
      expect(store.error).toBe('Remove failed')
    })
  })
})
