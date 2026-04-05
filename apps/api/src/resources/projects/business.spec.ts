import type { FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'

import { mockProject, mockProjectMember } from '~/__mocks__/factories.js'
import { addProjectMember, createProject, deleteProject, getProjectById, getProjectMembers, getProjects, removeProjectMember, updateProject, updateProjectMember } from './business.js'
import { addProjectMemberQuery, countProjectsInOrganization, createProjectQuery, deleteProjectQuery, getOrgMaxProjects, getProjectByIdQuery, getProjectDetailQuery, getProjectMemberByIdQuery, getProjectMemberQuery, getProjectMembersQuery, getProjectsQuery, getUserByEmailQuery, isOrgMember, removeProjectMemberQuery, updateProjectMemberQuery, updateProjectQuery } from './queries.js'

vi.mock('~/database.js')
vi.mock('./queries.js', () => ({
  createProjectQuery: vi.fn(),
  getProjectsQuery: vi.fn(),
  getProjectByIdQuery: vi.fn(),
  getProjectDetailQuery: vi.fn(),
  updateProjectQuery: vi.fn(),
  deleteProjectQuery: vi.fn(),
  countProjects: vi.fn(),
  countProjectsInOrganization: vi.fn(),
  getOrgMaxProjects: vi.fn().mockResolvedValue(null),
  getProjectMembersQuery: vi.fn(),
  getProjectMemberQuery: vi.fn(),
  addProjectMemberQuery: vi.fn(),
  updateProjectMemberQuery: vi.fn(),
  removeProjectMemberQuery: vi.fn(),
  getProjectMemberByIdQuery: vi.fn(),
  getUserByIdQuery: vi.fn(),
  getUserByEmailQuery: vi.fn(),
  isOrgMember: vi.fn().mockResolvedValue(true),
}))

const mockCreateProjectQuery = vi.mocked(createProjectQuery)
const mockGetProjectsQuery = vi.mocked(getProjectsQuery)
const mockGetProjectByIdQuery = vi.mocked(getProjectByIdQuery)
const mockGetProjectDetailQuery = vi.mocked(getProjectDetailQuery)
const mockUpdateProjectQuery = vi.mocked(updateProjectQuery)
const mockDeleteProjectQuery = vi.mocked(deleteProjectQuery)
const mockCountProjectsInOrg = vi.mocked(countProjectsInOrganization)
const mockGetProjectMembersQuery = vi.mocked(getProjectMembersQuery)
const mockGetProjectMemberQuery = vi.mocked(getProjectMemberQuery)
const mockAddProjectMemberQuery = vi.mocked(addProjectMemberQuery)
const mockUpdateProjectMemberQuery = vi.mocked(updateProjectMemberQuery)
const mockRemoveProjectMemberQuery = vi.mocked(removeProjectMemberQuery)
const mockGetProjectMemberByIdQuery = vi.mocked(getProjectMemberByIdQuery)
const mockGetUserByEmailQuery = vi.mocked(getUserByEmailQuery)
const mockIsOrgMember = vi.mocked(isOrgMember)
const mockGetOrgMaxProjects = vi.mocked(getOrgMaxProjects)

/** Shared owner id — project.ownerId matches the session user id. */
const OWNER_ID = randomUUID()

/** Mock audit logger injected via Fastify `server` decoration. */
const mockAuditLogger = { logAsync: vi.fn(), log: vi.fn() }
const mockServer = { auditLogger: mockAuditLogger } as unknown

/** Request mock for a regular (non-admin) user who owns the test project. */
const userReq = {
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  server: mockServer,
  session: { user: { id: OWNER_ID, role: 'user' }, session: { id: 's-1', userId: OWNER_ID } },
} as unknown as FastifyRequest

/** Request mock for an admin user. */
const adminReq = {
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  server: mockServer,
  session: { user: { id: OWNER_ID, role: 'admin' }, session: { id: 's-2', userId: OWNER_ID } },
} as unknown as FastifyRequest

/** Request mock for a user with an active organization. */
const orgUserReq = {
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  server: mockServer,
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
    it('should throw when no active organization is set', async () => {
      await expect(createProject(userReq, { name: data.name }))
        .rejects
        .toMatchObject({ statusCode: 400 })

      expect(mockCreateProjectQuery).not.toHaveBeenCalled()
    })

    it('should create a project and auto-add owner as member', async () => {
      const full = mockProject(data)
      const member = mockProjectMember({ id: 'member-1', projectId: data.id, userId: OWNER_ID, role: 'owner' })
      mockCreateProjectQuery.mockResolvedValueOnce(full)
      mockAddProjectMemberQuery.mockResolvedValueOnce(member)

      const result = await createProject(orgUserReq, { name: data.name })

      expect(mockCreateProjectQuery).toHaveBeenCalledTimes(1)
      expect(mockCreateProjectQuery).toHaveBeenCalledWith(expect.objectContaining({ name: data.name, ownerId: OWNER_ID, organizationId: 'org-1' }))
      expect(mockAddProjectMemberQuery).toHaveBeenCalledTimes(1)
      expect(mockAddProjectMemberQuery).toHaveBeenCalledWith(expect.objectContaining({ userId: OWNER_ID, role: 'owner' }))
      expect(result).toStrictEqual(full)
      expect(mockAuditLogger.logAsync).toHaveBeenCalledWith(expect.objectContaining({
        action: 'project:create',
        resourceType: 'project',
        actorId: OWNER_ID,
      }))
    })

    it('should set organizationId from active session organization', async () => {
      const full = mockProject({ ...data, organizationId: 'org-1' })
      mockCreateProjectQuery.mockResolvedValueOnce(full)
      mockAddProjectMemberQuery.mockResolvedValueOnce(mockProjectMember({ id: 'member-1', projectId: data.id, userId: OWNER_ID, role: 'owner' }))

      const result = await createProject(orgUserReq, { name: data.name })

      expect(mockCreateProjectQuery).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 'org-1' }))
      expect(result).toStrictEqual(full)
    })

    it('should throw when project quota is exceeded for non-admin', async () => {
      mockGetOrgMaxProjects.mockResolvedValueOnce(5)
      mockCountProjectsInOrg.mockResolvedValueOnce(5)

      await expect(createProject(orgUserReq, { name: data.name }))
        .rejects
        .toMatchObject({ statusCode: 403 })

      expect(mockCreateProjectQuery).not.toHaveBeenCalled()
    })

    it('should skip quota check for admin users', async () => {
      const full = mockProject({ ...data, organizationId: 'org-1' })
      mockCreateProjectQuery.mockResolvedValueOnce(full)
      mockAddProjectMemberQuery.mockResolvedValueOnce(mockProjectMember({ id: 'member-1', projectId: data.id, userId: OWNER_ID, role: 'owner' }))

      const adminOrgReq = {
        log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
        server: mockServer,
        session: { user: { id: OWNER_ID, role: 'admin' }, session: { id: 's-4', userId: OWNER_ID, activeOrganizationId: 'org-1' } },
      } as unknown as FastifyRequest

      const result = await createProject(adminOrgReq, { name: data.name })

      expect(mockCountProjectsInOrg).not.toHaveBeenCalled()
      expect(result).toStrictEqual(full)
    })
  })

  describe('getProjects', () => {
    it('should return all projects for an admin (no accessibleBy filter)', async () => {
      const full = mockProject(data)
      mockGetProjectsQuery.mockResolvedValueOnce([full])

      const result = await getProjects(adminReq)

      expect(mockGetProjectsQuery).toHaveBeenCalledWith({})
      expect(result).toStrictEqual({ projects: [full], total: undefined })
    })

    it('should pass accessibleBy for a regular user', async () => {
      mockGetProjectsQuery.mockResolvedValueOnce([])

      const result = await getProjects(userReq)

      expect(mockGetProjectsQuery).toHaveBeenCalledWith({ accessibleBy: OWNER_ID })
      expect(result).toStrictEqual({ projects: [], total: undefined })
    })
  })

  describe('getProjectById', () => {
    it('should return a project when found', async () => {
      const full = mockProject(data)
      mockGetProjectDetailQuery.mockResolvedValueOnce(full)

      const result = await getProjectById(userReq, data.id)

      expect(mockGetProjectDetailQuery).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(full)
    })

    it('should return null when project not found', async () => {
      mockGetProjectDetailQuery.mockResolvedValueOnce(null)

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
      expect(mockAuditLogger.logAsync).toHaveBeenCalledWith(expect.objectContaining({
        action: 'project:delete',
        resourceType: 'project',
        resourceId: data.id,
      }))
    })

    it('should return null when project not found', async () => {
      mockGetProjectByIdQuery.mockResolvedValueOnce(null)

      const result = await deleteProject(userReq, data.id)

      expect(mockDeleteProjectQuery).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })
  })

  describe('getProjectMembers', () => {
    it('should return members when project exists', async () => {
      const members = [mockProjectMember({ id: 'pm-1', projectId: data.id, userId: OWNER_ID, role: 'owner' })]
      mockGetProjectByIdQuery.mockResolvedValueOnce(mockProject(data))
      mockGetProjectMembersQuery.mockResolvedValueOnce({ members, ownerId: OWNER_ID })

      const result = await getProjectMembers(userReq, data.id)

      expect(result).toStrictEqual({ members, ownerId: OWNER_ID })
    })

    it('should return null when project not found', async () => {
      mockGetProjectByIdQuery.mockResolvedValueOnce(null)

      const result = await getProjectMembers(userReq, data.id)

      expect(result).toBeNull()
    })
  })

  describe('addProjectMember', () => {
    it('should add a member when project exists and user is not already a member', async () => {
      const userId = randomUUID()
      const email = 'test@example.com'
      const member = mockProjectMember({ id: 'pm-new', projectId: data.id, userId, role: 'member' })
      mockGetProjectByIdQuery.mockResolvedValueOnce(mockProject(data))
      mockGetUserByEmailQuery.mockResolvedValueOnce({ id: userId })
      mockGetProjectMemberQuery.mockResolvedValueOnce(null)
      mockAddProjectMemberQuery.mockResolvedValueOnce(member)

      const result = await addProjectMember(userReq, data.id, { email, role: 'member' })

      expect(result).toStrictEqual(member)
    })

    it('should throw NOT_FOUND when user does not exist', async () => {
      const email = 'unknown@example.com'
      mockGetProjectByIdQuery.mockResolvedValueOnce(mockProject(data))
      mockGetUserByEmailQuery.mockResolvedValueOnce(null)

      await expect(addProjectMember(userReq, data.id, { email, role: 'member' })).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 })
    })

    it('should throw FORBIDDEN when user is not a member of the project organization', async () => {
      const userId = randomUUID()
      const email = 'test@example.com'
      mockGetProjectByIdQuery.mockResolvedValueOnce(mockProject({ ...data, organizationId: 'org-1' }))
      mockGetUserByEmailQuery.mockResolvedValueOnce({ id: userId })
      mockIsOrgMember.mockResolvedValueOnce(false)

      await expect(addProjectMember(userReq, data.id, { email, role: 'member' })).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
    })

    it('should throw ALREADY_EXISTS when user is already a member', async () => {
      const userId = randomUUID()
      const email = 'test@example.com'
      mockGetProjectByIdQuery.mockResolvedValueOnce(mockProject(data))
      mockGetUserByEmailQuery.mockResolvedValueOnce({ id: userId })
      mockGetProjectMemberQuery.mockResolvedValueOnce(mockProjectMember({ id: 'pm-1', projectId: data.id, userId }))

      await expect(addProjectMember(userReq, data.id, { email, role: 'member' })).rejects.toMatchObject({ code: 'ALREADY_EXISTS', statusCode: 409 })
    })

    it('should throw NOT_FOUND when project does not exist', async () => {
      mockGetProjectByIdQuery.mockResolvedValueOnce(null)

      await expect(addProjectMember(userReq, data.id, { email: 'test@example.com', role: 'member' })).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 })
    })
  })

  describe('updateProjectMember', () => {
    it('should update member role', async () => {
      const memberId = 'pm-1'
      const member = mockProjectMember({ id: memberId, projectId: data.id, userId: randomUUID(), role: 'member' })
      const updated = { ...member, role: 'admin' }
      mockGetProjectMemberByIdQuery.mockResolvedValueOnce(member)
      mockUpdateProjectMemberQuery.mockResolvedValueOnce(updated)

      const result = await updateProjectMember(userReq, data.id, memberId, { role: 'admin' })

      expect(result).toStrictEqual(updated)
    })

    it('should throw FORBIDDEN when trying to change owner role', async () => {
      const memberId = 'pm-1'
      const ownerMember = mockProjectMember({ id: memberId, projectId: data.id, userId: OWNER_ID, role: 'owner' })
      mockGetProjectMemberByIdQuery.mockResolvedValueOnce(ownerMember)

      await expect(updateProjectMember(userReq, data.id, memberId, { role: 'admin' })).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
    })

    it('should throw NOT_FOUND when member does not exist', async () => {
      mockGetProjectMemberByIdQuery.mockResolvedValueOnce(null)

      await expect(updateProjectMember(userReq, data.id, 'nonexistent', { role: 'admin' })).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 })
    })
  })

  describe('removeProjectMember', () => {
    it('should remove a member', async () => {
      const memberId = 'pm-1'
      const member = mockProjectMember({ id: memberId, projectId: data.id, userId: randomUUID(), role: 'member' })
      mockGetProjectMemberByIdQuery.mockResolvedValueOnce(member)
      mockRemoveProjectMemberQuery.mockResolvedValueOnce(member)

      await removeProjectMember(userReq, data.id, memberId)

      expect(mockRemoveProjectMemberQuery).toHaveBeenCalledWith(memberId)
    })

    it('should throw FORBIDDEN when trying to remove the owner', async () => {
      const memberId = 'pm-1'
      const ownerMember = mockProjectMember({ id: memberId, projectId: data.id, userId: OWNER_ID, role: 'owner' })
      mockGetProjectMemberByIdQuery.mockResolvedValueOnce(ownerMember)

      await expect(removeProjectMember(userReq, data.id, memberId)).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
    })

    it('should throw NOT_FOUND when member does not exist', async () => {
      mockGetProjectMemberByIdQuery.mockResolvedValueOnce(null)

      await expect(removeProjectMember(userReq, data.id, 'nonexistent')).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 })
    })
  })
})
