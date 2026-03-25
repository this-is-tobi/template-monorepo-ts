import type { AddProjectMemberBody, CreateProjectBody, UpdateProjectBody } from '@template-monorepo-ts/shared'
import { randomUUID } from 'node:crypto'
import { apiPrefix } from '@template-monorepo-ts/shared'
import { mockProject, mockProjectMember } from '~/__mocks__/factories.js'

import app from '~/app.js'
import { MOCK_ADMIN_ID, mockUserSession } from '~/modules/auth/__mocks__/middleware.js'
import { requireAuth } from '~/modules/auth/middleware.js'
import { db } from '~/prisma/__mocks__/clients.js'
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
      db.project.create.mockResolvedValueOnce(created)

      const response = await app.inject()
        .post(`${apiPrefix.v1}/projects`)
        .body(body)
        .end()

      expect(db.project.create).toHaveBeenCalledTimes(1)
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
      db.project.create.mockRejectedValueOnce(new Error('unexpected error'))

      const body: CreateProjectBody = { name: 'My project' }

      const response = await app.inject()
        .post(`${apiPrefix.v1}/projects`)
        .body(body)
        .end()

      expect(db.project.create).toHaveBeenCalledTimes(1)
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
    it('should retrieve all projects', async () => {
      db.project.findMany.mockResolvedValueOnce([])

      const response = await app.inject()
        .get(`${apiPrefix.v1}/projects`)
        .end()

      expect(db.project.findMany).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
      expect(response.json().data).toMatchObject([])
    })
  })

  describe('getProjectById', () => {
    it('should retrieve project by its ID', async () => {
      const projectId = randomUUID()
      const project = mockProject({ id: projectId, name: 'My project', ownerId: randomUUID() })
      // First call: requirePermission's getOwnerId, second call: handler's getProjectById
      db.project.findUnique.mockResolvedValueOnce(project)
      db.project.findUnique.mockResolvedValueOnce(project)

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
      db.project.findUnique.mockResolvedValueOnce(null)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/projects/${projectId}`)
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('should return 403 when user lacks permission and is not the owner', async () => {
      const projectId = randomUUID()
      const project = mockProject({ id: projectId, name: 'My project', ownerId: 'other-owner-id' })
      // requirePermission's getOwnerId lookup
      db.project.findUnique.mockResolvedValueOnce(project)

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
      db.project.findUnique.mockResolvedValueOnce(existing)
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
      db.project.findUnique.mockResolvedValueOnce(project)

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
      db.project.findUnique.mockResolvedValueOnce(existing)
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
      db.project.findUnique.mockResolvedValueOnce(project)

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
    it('should retrieve members of a project', async () => {
      const projectId = randomUUID()
      const project = mockProject({ id: projectId, name: 'My project', ownerId: MOCK_ADMIN_ID })
      const member = mockProjectMember({ id: randomUUID(), projectId, userId: MOCK_ADMIN_ID, role: 'owner' })

      // requirePermission's getOwnerId + business layer getProjectByIdQuery + getProjectMembersQuery
      db.project.findUnique.mockResolvedValueOnce(project)
      db.project.findUnique.mockResolvedValueOnce(project)
      db.projectMember.findMany.mockResolvedValueOnce([member])
      db.project.findUnique.mockResolvedValueOnce({ ownerId: MOCK_ADMIN_ID } as never)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/projects/${projectId}/members`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json().data).toHaveLength(1)
    })
  })

  describe('addProjectMember', () => {
    it('should add a member to a project', async () => {
      const projectId = randomUUID()
      const userId = randomUUID()
      const project = mockProject({ id: projectId, name: 'My project', ownerId: MOCK_ADMIN_ID })
      const body: AddProjectMemberBody = { userId, role: 'member' }
      const member = mockProjectMember({ id: randomUUID(), projectId, userId, role: 'member' })

      // requirePermission's getOwnerId + business layer
      db.project.findUnique.mockResolvedValueOnce(project)
      db.project.findUnique.mockResolvedValueOnce(project)
      db.projectMember.findUnique.mockResolvedValueOnce(null)
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
      const project = mockProject({ id: projectId, name: 'My project', ownerId: MOCK_ADMIN_ID })
      const existingMember = mockProjectMember({ id: randomUUID(), projectId, userId })

      db.project.findUnique.mockResolvedValueOnce(project)
      db.project.findUnique.mockResolvedValueOnce(project)
      db.projectMember.findUnique.mockResolvedValueOnce(existingMember)

      const response = await app.inject()
        .post(`${apiPrefix.v1}/projects/${projectId}/members`)
        .body({ userId, role: 'member' })
        .end()

      expect(response.statusCode).toEqual(409)
    })
  })

  describe('updateProjectMember', () => {
    it('should update a member role', async () => {
      const projectId = randomUUID()
      const memberId = randomUUID()
      const project = mockProject({ id: projectId, name: 'My project', ownerId: MOCK_ADMIN_ID })
      const member = mockProjectMember({ id: memberId, projectId, userId: randomUUID(), role: 'member' })
      const updated = { ...member, role: 'admin' }

      db.project.findUnique.mockResolvedValueOnce(project)
      db.projectMember.findUnique.mockResolvedValueOnce(member)
      db.projectMember.update.mockResolvedValueOnce(updated)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/projects/${projectId}/members/${memberId}`)
        .body({ role: 'admin' })
        .end()

      expect(response.statusCode).toEqual(200)
    })
  })

  describe('removeProjectMember', () => {
    it('should remove a member from a project', async () => {
      const projectId = randomUUID()
      const memberId = randomUUID()
      const project = mockProject({ id: projectId, name: 'My project', ownerId: MOCK_ADMIN_ID })
      const member = mockProjectMember({ id: memberId, projectId, userId: randomUUID(), role: 'member' })

      db.project.findUnique.mockResolvedValueOnce(project)
      db.projectMember.findUnique.mockResolvedValueOnce(member)
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

      db.project.findUnique.mockResolvedValueOnce(project)
      db.projectMember.findUnique.mockResolvedValueOnce(ownerMember)

      const response = await app.inject()
        .delete(`${apiPrefix.v1}/projects/${projectId}/members/${memberId}`)
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })
})
