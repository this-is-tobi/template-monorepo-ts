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

/** Request mock for a regular (non-admin) user who owns the test project. */
const userReq = {
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  session: { user: { id: OWNER_ID, role: 'user' }, session: { id: 's-1', userId: OWNER_ID } },
} as unknown as FastifyRequest

/** Request mock for an admin user. */
const adminReq = {
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  session: { user: { id: OWNER_ID, role: 'admin' }, session: { id: 's-2', userId: OWNER_ID } },
} as unknown as FastifyRequest

/** Request mock for a user with an active organization. */
const orgUserReq = {
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  session: { user: { id: OWNER_ID, role: 'user' }, session: { id: 's-3', userId: OWNER_ID, activeOrganizationId: 'org-1' } },
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
      expect(mockCreateProjectQuery).toHaveBeenCalledWith(expect.objectContaining({ name: data.name, ownerId: OWNER_ID, organizationId: null }))
      expect(result).toStrictEqual(full)
    })

    it('should set organizationId from active session organization', async () => {
      const full = mockProject({ ...data, organizationId: 'org-1' })
      mockCreateProjectQuery.mockResolvedValueOnce(full)

      const result = await createProject(orgUserReq, { name: data.name })

      expect(mockCreateProjectQuery).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 'org-1' }))
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

      expect(mockGetProjectsQuery).toHaveBeenCalledWith({ ownerId: OWNER_ID })
      expect(result).toStrictEqual([full])
    })
  })

  describe('getProjectById', () => {
    it('should return a project when found', async () => {
      const full = mockProject(data)
      mockGetProjectByIdQuery.mockResolvedValueOnce(full)

      const result = await getProjectById(userReq, data.id)

      expect(mockGetProjectByIdQuery).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(full)
    })

    it('should return null when project not found', async () => {
      mockGetProjectByIdQuery.mockResolvedValueOnce(null)

      const result = await getProjectById(userReq, data.id)

      expect(result).toBeNull()
    })
  })

  describe('updateProject', () => {
    it('should update and return a project when found', async () => {
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

    it('should return null when project not found', async () => {
      mockGetProjectByIdQuery.mockResolvedValueOnce(null)

      const result = await updateProject(userReq, data.id, { name: 'Updated' })

      expect(mockUpdateProjectQuery).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })
  })

  describe('deleteProject', () => {
    it('should delete and return a project when found', async () => {
      const full = mockProject(data)
      mockGetProjectByIdQuery.mockResolvedValueOnce(full)
      mockDeleteProjectQuery.mockResolvedValueOnce(full)

      const result = await deleteProject(userReq, data.id)

      expect(mockGetProjectByIdQuery).toHaveBeenCalledTimes(1)
      expect(mockDeleteProjectQuery).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(full)
    })

    it('should return null when project not found', async () => {
      mockGetProjectByIdQuery.mockResolvedValueOnce(null)

      const result = await deleteProject(userReq, data.id)

      expect(mockDeleteProjectQuery).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })
  })
})
