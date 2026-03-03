import { randomUUID } from 'node:crypto'
import { apiPrefix } from '@template-monorepo-ts/shared'
import { mockProject } from '~/__mocks__/factories.js'

import app from '~/app.js'
import { MOCK_ADMIN_ID, mockUserSession } from '~/modules/auth/__mocks__/middleware.js'
import { requireAuth } from '~/modules/auth/middleware.js'
import { db } from '~/prisma/__mocks__/clients.js'
import { projectMessages } from './constants.js'

vi.mock('~/database.js')

/** Route body type — matches the route schema (no ownerId — derived from session) */
interface CreateProjectBody { name: string, description?: string | null }
interface UpdateProjectBody { name: string, description?: string | null }

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
      db.project.findUnique.mockResolvedValueOnce(project)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/projects/${projectId}`)
        .end()

      expect(db.project.findUnique).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
      expect(response.json().data.id).toEqual(projectId)
      expect(response.json().data.name).toEqual('My project')
    })

    it('should handle missing project', async () => {
      const projectId = randomUUID()
      db.project.findUnique.mockResolvedValueOnce(null)

      const response = await app.inject()
        .get(`${apiPrefix.v1}/projects/${projectId}`)
        .end()

      expect(db.project.findUnique).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(404)
    })

    it('should return 403 when user is not the owner', async () => {
      const projectId = randomUUID()
      const project = mockProject({ id: projectId, name: 'My project', ownerId: 'other-owner-id' })
      db.project.findUnique.mockResolvedValueOnce(project)

      // Override for this single request: regular user who is NOT the owner
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as any
      })

      const response = await app.inject()
        .get(`${apiPrefix.v1}/projects/${projectId}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('PROJECT_FORBIDDEN')
    })
  })

  describe('updateProject', () => {
    it('should update project by its ID', async () => {
      const projectId = randomUUID()
      const ownerId = randomUUID()
      const body: UpdateProjectBody = { name: 'Updated project' }
      const existing = mockProject({ id: projectId, name: 'My project', ownerId })
      const updated = mockProject({ id: projectId, name: body.name, ownerId })

      db.project.findUnique.mockResolvedValueOnce(existing)
      db.project.update.mockResolvedValueOnce(updated)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/projects/${projectId}`)
        .body(body)
        .end()

      expect(db.project.findUnique).toHaveBeenCalledTimes(1)
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

    it('should return 403 when user is not the owner', async () => {
      const projectId = randomUUID()
      const body: UpdateProjectBody = { name: 'Updated project' }

      const businessModule = await import('./business.js')
      const updateProjectSpy = vi.spyOn(businessModule, 'updateProject')
      updateProjectSpy.mockResolvedValueOnce('forbidden' as any)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/projects/${projectId}`)
        .body(body)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('PROJECT_FORBIDDEN')

      updateProjectSpy.mockRestore()
    })
  })

  describe('deleteProject', () => {
    it('should delete project by its ID', async () => {
      const projectId = randomUUID()
      const ownerId = randomUUID()
      const existing = mockProject({ id: projectId, name: 'My project', ownerId })

      db.project.findUnique.mockResolvedValueOnce(existing)
      db.project.delete.mockResolvedValueOnce(existing)

      const response = await app.inject()
        .delete(`${apiPrefix.v1}/projects/${projectId}`)
        .end()

      expect(db.project.findUnique).toHaveBeenCalledTimes(1)
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

    it('should return 403 when user is not the owner', async () => {
      const projectId = randomUUID()

      const businessModule = await import('./business.js')
      const deleteProjectSpy = vi.spyOn(businessModule, 'deleteProject')
      deleteProjectSpy.mockResolvedValueOnce('forbidden' as any)

      const response = await app.inject()
        .delete(`${apiPrefix.v1}/projects/${projectId}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('PROJECT_FORBIDDEN')

      deleteProjectSpy.mockRestore()
    })
  })
})
