import { randomUUID } from 'node:crypto'

import { mockProject } from '~/__mocks__/factories.js'
import { db } from '~/prisma/__mocks__/clients.js'
import { createProjectQuery, deleteProjectQuery, getProjectByIdQuery, getProjectsQuery, updateProjectQuery } from './queries.js'

vi.mock('~/database.js')

describe('[Projects] - Queries', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
  })

  const data = {
    id: randomUUID(),
    name: 'My project',
    ownerId: randomUUID(),
  }

  describe('createProjectQuery', () => {
    it('should create a project', async () => {
      const full = mockProject(data)
      db.project.create.mockResolvedValueOnce(full)

      const project = await createProjectQuery(data)

      expect(db.project.create).toHaveBeenCalledTimes(1)
      expect(project).toStrictEqual(full)
    })
  })

  describe('getProjectsQuery', () => {
    it('should get projects', async () => {
      const full = mockProject(data)
      db.project.findMany.mockResolvedValueOnce([full])

      const projects = await getProjectsQuery()

      expect(db.project.findMany).toHaveBeenCalledTimes(1)
      expect(projects).toStrictEqual([full])
    })

    it('should filter projects by ownerId when provided', async () => {
      const full = mockProject(data)
      db.project.findMany.mockResolvedValueOnce([full])

      const projects = await getProjectsQuery(data.ownerId)

      expect(db.project.findMany).toHaveBeenCalledWith({ where: { ownerId: data.ownerId } })
      expect(projects).toStrictEqual([full])
    })
  })

  describe('getProjectByIdQuery', () => {
    it('should get project by its ID', async () => {
      const full = mockProject(data)
      db.project.findUnique.mockResolvedValueOnce(full)

      const project = await getProjectByIdQuery(data.id)

      expect(db.project.findUnique).toHaveBeenCalledTimes(1)
      expect(project).toStrictEqual(full)
    })
  })

  describe('updateProjectQuery', () => {
    it('should update project by its ID', async () => {
      const updatedFull = mockProject({ ...data, description: 'Updated description' })
      db.project.update.mockResolvedValueOnce(updatedFull)

      const project = await updateProjectQuery(data.id, {
        name: data.name,
        description: 'Updated description',
      })

      expect(db.project.update).toHaveBeenCalledTimes(1)
      expect(project).toStrictEqual(updatedFull)
    })
  })

  describe('deleteProjectQuery', () => {
    it('should delete project by its ID', async () => {
      const full = mockProject(data)
      db.project.delete.mockResolvedValueOnce(full)

      await deleteProjectQuery(data.id)

      expect(db.project.delete).toHaveBeenCalledTimes(1)
    })
  })
})
