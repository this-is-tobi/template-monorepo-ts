import type { FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'

import { mockProject } from '~/__mocks__/factories.js'
import { createProject, deleteProject, getProjectById, getProjects, updateProject } from './business.js'
import { createProjectQuery, deleteProjectQuery, getProjectByIdQuery, getProjectsQuery, updateProjectQuery } from './queries.js'

vi.mock('~/database.js')
vi.mock('./queries.js', () => ({
  createProjectQuery: vi.fn(),
  getProjectsQuery: vi.fn(),
  getProjectByIdQuery: vi.fn(),
  updateProjectQuery: vi.fn(),
  deleteProjectQuery: vi.fn(),
}))

const mockCreateProjectQuery = vi.mocked(createProjectQuery)
const mockGetProjectsQuery = vi.mocked(getProjectsQuery)
const mockGetProjectByIdQuery = vi.mocked(getProjectByIdQuery)
const mockUpdateProjectQuery = vi.mocked(updateProjectQuery)
const mockDeleteProjectQuery = vi.mocked(deleteProjectQuery)

/** Shared owner id — project.ownerId matches the session user id. */
const OWNER_ID = randomUUID()
const OTHER_ID = randomUUID()

/** Request mock for a regular (non-admin) user who owns the test project. */
const userReq = {
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  session: { user: { id: OWNER_ID, role: 'user' } },
} as unknown as FastifyRequest

/** Request mock for an admin user. */
const adminReq = {
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  session: { user: { id: OWNER_ID, role: 'admin' } },
} as unknown as FastifyRequest

/** Request mock for a regular user who does NOT own the project. */
const otherUserReq = {
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  session: { user: { id: OTHER_ID, role: 'user' } },
} as unknown as FastifyRequest

const data = {
  id: randomUUID(),
  name: 'My project',
  ownerId: OWNER_ID,
}

describe('[Projects] - Business', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createProject', () => {
    it('should create and return a project (ownerId from session)', async () => {
      const full = mockProject(data)
      mockCreateProjectQuery.mockResolvedValueOnce(full)

      const result = await createProject(userReq, { name: data.name })

      expect(mockCreateProjectQuery).toHaveBeenCalledTimes(1)
      expect(mockCreateProjectQuery).toHaveBeenCalledWith(expect.objectContaining({ name: data.name, ownerId: OWNER_ID }))
      expect(result).toStrictEqual(full)
    })
  })

  describe('getProjects', () => {
    it('should return all projects for an admin (no ownerId filter)', async () => {
      const full = mockProject(data)
      mockGetProjectsQuery.mockResolvedValueOnce([full])

      const result = await getProjects(adminReq)

      expect(mockGetProjectsQuery).toHaveBeenCalledWith(undefined)
      expect(result).toStrictEqual([full])
    })

    it('should return only own projects for a regular user', async () => {
      const full = mockProject(data)
      mockGetProjectsQuery.mockResolvedValueOnce([full])

      const result = await getProjects(userReq)

      expect(mockGetProjectsQuery).toHaveBeenCalledWith(OWNER_ID)
      expect(result).toStrictEqual([full])
    })
  })

  describe('getProjectById', () => {
    it('should return a project when user is the owner', async () => {
      const full = mockProject(data)
      mockGetProjectByIdQuery.mockResolvedValueOnce(full)

      const result = await getProjectById(userReq, data.id)

      expect(mockGetProjectByIdQuery).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(full)
    })

    it('should return a project when user is admin (not owner)', async () => {
      const full = mockProject({ ...data, ownerId: OTHER_ID })
      mockGetProjectByIdQuery.mockResolvedValueOnce(full)

      const result = await getProjectById(adminReq, data.id)

      expect(result).toStrictEqual(full)
    })

    it('should return \'forbidden\' when user is not the owner', async () => {
      const full = mockProject(data) // data.ownerId = OWNER_ID, request is otherUserReq
      mockGetProjectByIdQuery.mockResolvedValueOnce(full)

      const result = await getProjectById(otherUserReq, data.id)

      expect(result).toBe('forbidden')
    })

    it('should return null when project not found', async () => {
      mockGetProjectByIdQuery.mockResolvedValueOnce(null)

      const result = await getProjectById(userReq, data.id)

      expect(result).toBeNull()
    })
  })

  describe('updateProject', () => {
    it('should update and return a project when user is the owner', async () => {
      const updateData = { name: 'Updated project', description: 'New description' }
      const existing = mockProject(data)
      const updated = mockProject({ ...data, ...updateData })
      mockGetProjectByIdQuery.mockResolvedValueOnce(existing)
      mockUpdateProjectQuery.mockResolvedValueOnce(updated)

      const result = await updateProject(userReq, data.id, updateData)

      expect(mockGetProjectByIdQuery).toHaveBeenCalledTimes(1)
      expect(mockUpdateProjectQuery).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(updated)
    })

    it('should update and return a project when user is admin (not owner)', async () => {
      const existing = mockProject({ ...data, ownerId: OTHER_ID })
      const updated = mockProject({ ...data, ownerId: OTHER_ID, name: 'Admin updated' })
      mockGetProjectByIdQuery.mockResolvedValueOnce(existing)
      mockUpdateProjectQuery.mockResolvedValueOnce(updated)

      const result = await updateProject(adminReq, data.id, { name: 'Admin updated' })

      expect(result).toStrictEqual(updated)
    })

    it('should return \'forbidden\' when user is not the owner', async () => {
      const existing = mockProject(data) // ownerId = OWNER_ID, request is otherUserReq
      mockGetProjectByIdQuery.mockResolvedValueOnce(existing)

      const result = await updateProject(otherUserReq, data.id, { name: 'Hacked' })

      expect(mockUpdateProjectQuery).not.toHaveBeenCalled()
      expect(result).toBe('forbidden')
    })

    it('should return null when project not found', async () => {
      mockGetProjectByIdQuery.mockResolvedValueOnce(null)

      const result = await updateProject(userReq, data.id, { name: 'Updated' })

      expect(mockUpdateProjectQuery).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })
  })

  describe('deleteProject', () => {
    it('should delete and return a project when user is the owner', async () => {
      const full = mockProject(data)
      mockGetProjectByIdQuery.mockResolvedValueOnce(full)
      mockDeleteProjectQuery.mockResolvedValueOnce(full)

      const result = await deleteProject(userReq, data.id)

      expect(mockGetProjectByIdQuery).toHaveBeenCalledTimes(1)
      expect(mockDeleteProjectQuery).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(full)
    })

    it('should delete a project when user is admin (not owner)', async () => {
      const full = mockProject({ ...data, ownerId: OTHER_ID })
      mockGetProjectByIdQuery.mockResolvedValueOnce(full)
      mockDeleteProjectQuery.mockResolvedValueOnce(full)

      const result = await deleteProject(adminReq, data.id)

      expect(result).toStrictEqual(full)
    })

    it('should return \'forbidden\' when user is not the owner', async () => {
      const full = mockProject(data) // ownerId = OWNER_ID, request is otherUserReq
      mockGetProjectByIdQuery.mockResolvedValueOnce(full)

      const result = await deleteProject(otherUserReq, data.id)

      expect(mockDeleteProjectQuery).not.toHaveBeenCalled()
      expect(result).toBe('forbidden')
    })

    it('should return null when project not found', async () => {
      mockGetProjectByIdQuery.mockResolvedValueOnce(null)

      const result = await deleteProject(userReq, data.id)

      expect(mockDeleteProjectQuery).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })
  })
})
