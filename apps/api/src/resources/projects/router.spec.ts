import type { AddProjectMemberBody, CreateProjectBody, UpdateProjectBody } from '@template-monorepo-ts/shared'
import { randomUUID } from 'node:crypto'
import { apiPrefix } from '@template-monorepo-ts/shared'
import { mockProject, mockProjectMember } from '~/__mocks__/factories.js'

import app from '~/app.js'
import { MOCK_ADMIN_ID, mockUserSession } from '~/modules/auth/__mocks__/middleware.js'
import { requireAuth } from '~/modules/auth/middleware.js'
import { db, dbRo } from '~/prisma/__mocks__/clients.js'
import { projectMessages } from './constants.js'

vi.mock('~/database.js')

describe('[Projects] - router', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
  })

  describe('createProject', () => {
    it('should create new project', async () => {
      const ownerId = MOCK_ADMIN_ID
      const body: CreateProjectBody = { name: 'My project' }
      const created = mockProject({ id: randomUUID(), name: body.name, ownerId })
      vi.mocked(db.$transaction).mockImplementationOnce(async (fn) => {
        return (fn as (tx: Record<string, unknown>) => Promise<unknown>)({
          project: { create: vi.fn().mockResolvedValueOnce(created) },
          projectMember: { create: vi.fn().mockResolvedValueOnce({}) },
        })
      })

      const response = await app.inject()
        .post(`${apiPrefix.v1}/projects`)
        .body(body)
        .end()

      expect(db.$transaction).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(201)
      expect(response.json().data.name).toEqual(body.name)
    })

    it('should not create project - missing "name" required key', async () => {
      const body = {}

      const response = await app.inject()
        .post(`${apiPrefix.v1}/projects`)
        .body(body)
        .end()

      expect(db.project.create).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(400)
    })

    it('should not create project - unexpected error', async () => {
      vi.mocked(db.$transaction).mockRejectedValueOnce(new Error('unexpected error'))

      const body: CreateProjectBody = { name: 'My project' }

      const response = await app.inject()
        .post(`${apiPrefix.v1}/projects`)
        .body(body)
        .end()

      expect(db.$transaction).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(500)
    })

    it('should return 403 when user lacks project:create permission', async () => {
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as any
      })

      const response = await app.inject()
        .post(`${apiPrefix.v1}/projects`)
        .body({ name: 'My project' })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('INSUFFICIENT_PERMISSIONS')
    })
  })

  describe('getProjects', () => {
    it('should retrieve all projects with total', async () => {
      dbRo.project.findMany.mockResolvedValueOnce([])
      dbRo.project.count.mockResolvedValueOnce(0)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/projects`)
        .end()

      expect(dbRo.project.findMany).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
      expect(response.json().data).toMatchObject([])
      expect(response.json().total).toBe(0)
    })

    it('should allow non-admin user to list projects via ownership fallback', async () => {
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as any
      })
      // buildAccessibleWhere queries for user's project memberships and org memberships
      dbRo.projectMember.findMany.mockResolvedValueOnce([])
      dbRo.member.findMany.mockResolvedValueOnce([])
      dbRo.project.findMany.mockResolvedValueOnce([])
      dbRo.projectMember.findMany.mockResolvedValueOnce([])
      dbRo.member.findMany.mockResolvedValueOnce([])
      dbRo.project.count.mockResolvedValueOnce(0)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/projects`)
        .end()

      expect(response.statusCode).toEqual(200)
    })

    // Regression: this route ran no permission check at all, so
    // `req.apiKeyPermissions` was never consulted and a key capped to
    // `{"audit":["read"]}` still enumerated every project its owner could
    // reach. A cap that lapses on the listing route is not a cap.
    it('should refuse an API key whose cap does not include project:read', async () => {
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as any
        req.isApiKey = true
        req.apiKeyPermissions = { audit: ['read'] }
      })

      const response = await app.inject()
        .get(`${apiPrefix.v1}/projects`)
        .end()

      expect(dbRo.project.findMany).not.toHaveBeenCalled()
      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('API_KEY_PERMISSIONS_DENIED')
    })

    it('should allow an API key whose cap includes project:read', async () => {
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as any
        req.isApiKey = true
        req.apiKeyPermissions = { project: ['read'] }
      })
      dbRo.projectMember.findMany.mockResolvedValueOnce([])
      dbRo.member.findMany.mockResolvedValueOnce([])
      dbRo.project.findMany.mockResolvedValueOnce([])
      dbRo.projectMember.findMany.mockResolvedValueOnce([])
      dbRo.member.findMany.mockResolvedValueOnce([])
      dbRo.project.count.mockResolvedValueOnce(0)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/projects`)
        .end()

      expect(response.statusCode).toEqual(200)
    })
  })

  describe('getProjectById', () => {
    it('should retrieve project by its ID', async () => {
      const projectId = randomUUID()
      const project = mockProject({ id: projectId, name: 'My project', ownerId: randomUUID() })
      // First call: requirePermission's getOwnerId, second call: handler's getProjectById
      dbRo.project.findUnique.mockResolvedValueOnce(project)
      dbRo.project.findUnique.mockResolvedValueOnce(project)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/projects/${projectId}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json().data.id).toEqual(projectId)
      expect(response.json().data.name).toEqual('My project')
    })

    it('should handle missing project', async () => {
      const projectId = randomUUID()
      // Admin bypass in requirePermission → no getOwnerId call needed
      dbRo.project.findUnique.mockResolvedValueOnce(null)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/projects/${projectId}`)
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('should return 403 when user lacks permission and is not the owner', async () => {
      const projectId = randomUUID()
      const project = mockProject({ id: projectId, name: 'My project', ownerId: 'other-owner-id' })
      // requirePermission's getOwnerId lookup
      dbRo.project.findUnique.mockResolvedValueOnce(project)

      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as any
      })

      const response = await app.inject()
        .get(`${apiPrefix.v1}/projects/${projectId}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('INSUFFICIENT_PERMISSIONS')
    })
  })

  describe('updateProject', () => {
    it('should update project by its ID', async () => {
      const projectId = randomUUID()
      const ownerId = randomUUID()
      const body: UpdateProjectBody = { name: 'Updated project' }
      const existing = mockProject({ id: projectId, name: 'My project', ownerId })
      const updated = mockProject({ id: projectId, name: body.name, ownerId })

      // Admin bypass → no getOwnerId call, then handler queries twice (findUnique + update)
      dbRo.project.findUnique.mockResolvedValueOnce(existing)
      db.project.update.mockResolvedValueOnce(updated)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/projects/${projectId}`)
        .body(body)
        .end()

      expect(db.project.update).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
    })

    it('should handle missing project when updating', async () => {
      const projectId = randomUUID()
      const body: UpdateProjectBody = { name: 'Updated project' }

      const businessModule = await import('./business.js')
      const updateProjectSpy = vi.spyOn(businessModule, 'updateProject')
      updateProjectSpy.mockResolvedValueOnce(null as any)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/projects/${projectId}`)
        .body(body)
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.json().message).toEqual(projectMessages.notFound)
      expect(response.json().error).toEqual('PROJECT_NOT_FOUND')

      updateProjectSpy.mockRestore()
    })

    it('should return 403 when user lacks permission and is not the owner', async () => {
      const projectId = randomUUID()
      const body: UpdateProjectBody = { name: 'Updated project' }
      const project = mockProject({ id: projectId, name: 'My project', ownerId: 'other-owner-id' })
      dbRo.project.findUnique.mockResolvedValueOnce(project)

      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as any
      })

      const response = await app.inject()
        .put(`${apiPrefix.v1}/projects/${projectId}`)
        .body(body)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('INSUFFICIENT_PERMISSIONS')
    })
  })

  describe('deleteProject', () => {
    it('should delete project by its ID', async () => {
      const projectId = randomUUID()
      const ownerId = randomUUID()
      const existing = mockProject({ id: projectId, name: 'My project', ownerId })

      // Admin bypass → no getOwnerId call, then handler queries twice (findUnique + delete)
      dbRo.project.findUnique.mockResolvedValueOnce(existing)
      db.project.delete.mockResolvedValueOnce(existing)

      const response = await app.inject()
        .delete(`${apiPrefix.v1}/projects/${projectId}`)
        .end()

      expect(db.project.delete).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
    })

    it('should handle missing project when deleting', async () => {
      const projectId = randomUUID()

      const businessModule = await import('./business.js')
      const deleteProjectSpy = vi.spyOn(businessModule, 'deleteProject')
      deleteProjectSpy.mockResolvedValueOnce(null as any)

      const response = await app.inject()
        .delete(`${apiPrefix.v1}/projects/${projectId}`)
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.json().message).toEqual(projectMessages.notFound)
      expect(response.json().error).toEqual('PROJECT_NOT_FOUND')

      deleteProjectSpy.mockRestore()
    })

    it('should return 403 when user lacks permission and is not the owner', async () => {
      const projectId = randomUUID()
      const project = mockProject({ id: projectId, name: 'My project', ownerId: 'other-owner-id' })
      dbRo.project.findUnique.mockResolvedValueOnce(project)

      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as any
      })

      const response = await app.inject()
        .delete(`${apiPrefix.v1}/projects/${projectId}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('INSUFFICIENT_PERMISSIONS')
    })
  })

  describe('getProjectMembers', () => {
    it('should retrieve members of a project with total', async () => {
      const projectId = randomUUID()
      const project = mockProject({ id: projectId, name: 'My project', ownerId: MOCK_ADMIN_ID })
      const member = mockProjectMember({ id: randomUUID(), projectId, userId: MOCK_ADMIN_ID, role: 'owner' })

      // business layer getProjectByIdQuery + getProjectMembersQuery (combined)
      // Note: requirePermission's getOwnerId is NOT called because admin bypass (step 1) short-circuits.
      dbRo.project.findUnique.mockResolvedValueOnce(project)
      dbRo.project.findUnique.mockResolvedValueOnce({ ownerId: MOCK_ADMIN_ID, members: [member] } as never)
      dbRo.projectMember.count.mockResolvedValueOnce(1)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/projects/${projectId}/members`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json().data).toHaveLength(1)
      expect(response.json().total).toBe(1)
    })

    it('should return 403 when user lacks permission and is not the owner', async () => {
      const projectId = randomUUID()
      const project = mockProject({ id: projectId, name: 'My project', ownerId: 'other-owner-id' })
      dbRo.project.findUnique.mockResolvedValueOnce(project)

      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as any
      })

      const response = await app.inject()
        .get(`${apiPrefix.v1}/projects/${projectId}/members`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('INSUFFICIENT_PERMISSIONS')
    })
  })

  describe('addProjectMember', () => {
    it('should add a member to a project', async () => {
      const projectId = randomUUID()
      const userId = randomUUID()
      const email = 'member@example.com'
      const project = mockProject({ id: projectId, name: 'My project', ownerId: MOCK_ADMIN_ID })
      const body: AddProjectMemberBody = { email, role: 'member' }
      const member = mockProjectMember({ id: randomUUID(), projectId, userId, role: 'member' })

      // requirePermission's getOwnerId + business layer
      dbRo.project.findUnique.mockResolvedValueOnce(project)
      dbRo.project.findUnique.mockResolvedValueOnce(project)
      dbRo.user.findFirst.mockResolvedValueOnce({ id: userId } as any)
      dbRo.projectMember.findUnique.mockResolvedValueOnce(null)
      db.projectMember.create.mockResolvedValueOnce(member)

      const response = await app.inject()
        .post(`${apiPrefix.v1}/projects/${projectId}/members`)
        .body(body)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json().data.userId).toEqual(userId)
    })

    it('should return 409 when member already exists', async () => {
      const projectId = randomUUID()
      const userId = randomUUID()
      const email = 'member@example.com'
      const project = mockProject({ id: projectId, name: 'My project', ownerId: MOCK_ADMIN_ID })
      const existingMember = mockProjectMember({ id: randomUUID(), projectId, userId })

      dbRo.project.findUnique.mockResolvedValueOnce(project)
      dbRo.project.findUnique.mockResolvedValueOnce(project)
      dbRo.user.findFirst.mockResolvedValueOnce({ id: userId } as any)
      dbRo.projectMember.findUnique.mockResolvedValueOnce(existingMember)

      const response = await app.inject()
        .post(`${apiPrefix.v1}/projects/${projectId}/members`)
        .body({ email, role: 'member' })
        .end()

      expect(response.statusCode).toEqual(409)
    })

    it('should return 403 when user lacks permission and is not the owner', async () => {
      const projectId = randomUUID()
      const project = mockProject({ id: projectId, name: 'My project', ownerId: 'other-owner-id' })
      dbRo.project.findUnique.mockResolvedValueOnce(project)

      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as any
      })

      const response = await app.inject()
        .post(`${apiPrefix.v1}/projects/${projectId}/members`)
        .body({ email: 'test@example.com', role: 'member' })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('INSUFFICIENT_PERMISSIONS')
    })
  })

  describe('updateProjectMember', () => {
    it('should update a member role', async () => {
      const projectId = randomUUID()
      const memberId = randomUUID()
      const project = mockProject({ id: projectId, name: 'My project', ownerId: MOCK_ADMIN_ID })
      const member = mockProjectMember({ id: memberId, projectId, userId: randomUUID(), role: 'member' })
      const updated = { ...member, role: 'admin' }

      dbRo.project.findUnique.mockResolvedValueOnce(project)
      dbRo.projectMember.findUnique.mockResolvedValueOnce(member)
      db.projectMember.update.mockResolvedValueOnce(updated)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/projects/${projectId}/members/${memberId}`)
        .body({ role: 'admin' })
        .end()

      expect(response.statusCode).toEqual(200)
    })

    it('should return 403 when user lacks permission and is not the owner', async () => {
      const projectId = randomUUID()
      const memberId = randomUUID()
      const project = mockProject({ id: projectId, name: 'My project', ownerId: 'other-owner-id' })
      dbRo.project.findUnique.mockResolvedValueOnce(project)

      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as any
      })

      const response = await app.inject()
        .put(`${apiPrefix.v1}/projects/${projectId}/members/${memberId}`)
        .body({ role: 'admin' })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('INSUFFICIENT_PERMISSIONS')
    })
  })

  describe('removeProjectMember', () => {
    it('should remove a member from a project', async () => {
      const projectId = randomUUID()
      const memberId = randomUUID()
      const project = mockProject({ id: projectId, name: 'My project', ownerId: MOCK_ADMIN_ID })
      const member = mockProjectMember({ id: memberId, projectId, userId: randomUUID(), role: 'member' })

      dbRo.project.findUnique.mockResolvedValueOnce(project)
      dbRo.projectMember.findUnique.mockResolvedValueOnce(member)
      db.projectMember.delete.mockResolvedValueOnce(member)

      const response = await app.inject()
        .delete(`${apiPrefix.v1}/projects/${projectId}/members/${memberId}`)
        .end()

      expect(response.statusCode).toEqual(200)
    })

    it('should return 403 when trying to remove the owner', async () => {
      const projectId = randomUUID()
      const memberId = randomUUID()
      const project = mockProject({ id: projectId, name: 'My project', ownerId: MOCK_ADMIN_ID })
      const ownerMember = mockProjectMember({ id: memberId, projectId, userId: MOCK_ADMIN_ID, role: 'owner' })

      dbRo.project.findUnique.mockResolvedValueOnce(project)
      dbRo.projectMember.findUnique.mockResolvedValueOnce(ownerMember)

      const response = await app.inject()
        .delete(`${apiPrefix.v1}/projects/${projectId}/members/${memberId}`)
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })

  describe('service keys', () => {
    const projectId = randomUUID()

    /** The route preloads the project, so every case needs it to exist. */
    function existingProject() {
      dbRo.project.findUnique.mockResolvedValueOnce(
        mockProject({ id: projectId, name: 'Apollo', ownerId: MOCK_ADMIN_ID, organizationId: 'org-1' }) as never,
      )
    }

    it('should list keys for a project', async () => {
      existingProject()
      dbRo.user.findFirst.mockResolvedValueOnce({ id: 'svc-1' } as never)
      dbRo.apiKey.findMany.mockResolvedValueOnce([] as never)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/projects/${projectId}/service-keys`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toMatchObject({ data: [], total: 0 })
    })

    it('should reject a key with no permissions', async () => {
      // A key that declares nothing inherits its owner's permissions, and a
      // service account owns nothing — so it would be a credential that
      // silently does nothing. Better to refuse at the door.
      existingProject()

      const response = await app.inject()
        .post(`${apiPrefix.v1}/projects/${projectId}/service-keys`)
        .body({ name: 'CI', permissions: {} })
        .end()

      expect(response.statusCode).toEqual(400)
    })

    it('should reject a key with no name', async () => {
      existingProject()

      const response = await app.inject()
        .post(`${apiPrefix.v1}/projects/${projectId}/service-keys`)
        .body({ name: '', permissions: { project: ['read'] } })
        .end()

      expect(response.statusCode).toEqual(400)
    })

    it('should return 403 to someone who cannot manage the project', async () => {
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as never
      })
      dbRo.project.findUnique.mockResolvedValueOnce(
        mockProject({ id: projectId, name: 'Apollo', ownerId: 'someone-else', organizationId: 'org-1' }) as never,
      )

      const response = await app.inject()
        .post(`${apiPrefix.v1}/projects/${projectId}/service-keys`)
        .body({ name: 'CI', permissions: { project: ['read'] } })
        .end()

      expect(response.statusCode).toEqual(403)
    })

    it('should 404 when revoking a key the project does not own', async () => {
      existingProject()
      dbRo.user.findFirst.mockResolvedValueOnce({ id: 'svc-1' } as never)
      dbRo.apiKey.findFirst.mockResolvedValueOnce(null)

      const response = await app.inject()
        .delete(`${apiPrefix.v1}/projects/${projectId}/service-keys/some-other-key`)
        .end()

      expect(response.statusCode).toEqual(404)
      expect(db.apiKey.delete).not.toHaveBeenCalled()
    })
  })
})
