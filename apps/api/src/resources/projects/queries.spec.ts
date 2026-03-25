import { randomUUID } from 'node:crypto'

import { mockProject, mockProjectMember } from '~/__mocks__/factories.js'
import { db } from '~/prisma/__mocks__/clients.js'
import { addProjectMemberQuery, countProjects, createProjectQuery, deleteProjectQuery, getOrgIdsForUser, getProjectByIdQuery, getProjectIdsForUser, getProjectMemberByIdQuery, getProjectMemberQuery, getProjectMembersQuery, getProjectsQuery, removeProjectMemberQuery, updateProjectMemberQuery, updateProjectQuery } from './queries.js'

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
    it('should get all projects when no filters provided', async () => {
      const full = mockProject(data)
      db.project.findMany.mockResolvedValueOnce([full])

      const projects = await getProjectsQuery()

      expect(db.project.findMany).toHaveBeenCalledTimes(1)
      expect(projects).toStrictEqual([full])
    })

    it('should filter projects by ownerId when provided', async () => {
      const full = mockProject(data)
      db.project.findMany.mockResolvedValueOnce([full])

      const projects = await getProjectsQuery({ ownerId: data.ownerId })

      expect(db.project.findMany).toHaveBeenCalledWith({ where: { ownerId: data.ownerId } })
      expect(projects).toStrictEqual([full])
    })

    it('should filter projects by organizationId when provided', async () => {
      const orgId = randomUUID()
      const full = mockProject({ ...data, organizationId: orgId })
      db.project.findMany.mockResolvedValueOnce([full])

      const projects = await getProjectsQuery({ organizationId: orgId })

      expect(db.project.findMany).toHaveBeenCalledWith({ where: { organizationId: orgId } })
      expect(projects).toStrictEqual([full])
    })

    it('should combine ownerId and organizationId filters', async () => {
      const orgId = randomUUID()
      const full = mockProject({ ...data, organizationId: orgId })
      db.project.findMany.mockResolvedValueOnce([full])

      const projects = await getProjectsQuery({ ownerId: data.ownerId, organizationId: orgId })

      expect(db.project.findMany).toHaveBeenCalledWith({ where: { ownerId: data.ownerId, organizationId: orgId } })
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

  describe('getProjectMembersQuery', () => {
    it('should return members with user data and ownerId', async () => {
      const projectId = data.id
      const memberData = [mockProjectMember({ id: randomUUID(), projectId, userId: randomUUID() })]
      db.projectMember.findMany.mockResolvedValueOnce(memberData)
      db.project.findUnique.mockResolvedValueOnce({ ownerId: data.ownerId } as never)

      const result = await getProjectMembersQuery(projectId)

      expect(db.projectMember.findMany).toHaveBeenCalledTimes(1)
      expect(result.members).toStrictEqual(memberData)
      expect(result.ownerId).toBe(data.ownerId)
    })
  })

  describe('getProjectMemberQuery', () => {
    it('should find a member by projectId and userId', async () => {
      const member = mockProjectMember({ id: randomUUID(), projectId: data.id, userId: data.ownerId })
      db.projectMember.findUnique.mockResolvedValueOnce(member)

      const result = await getProjectMemberQuery(data.id, data.ownerId)

      expect(db.projectMember.findUnique).toHaveBeenCalledWith({
        where: { projectId_userId: { projectId: data.id, userId: data.ownerId } },
      })
      expect(result).toStrictEqual(member)
    })
  })

  describe('addProjectMemberQuery', () => {
    it('should create a project member', async () => {
      const memberInput = { id: randomUUID(), projectId: data.id, userId: randomUUID(), role: 'member' }
      const member = mockProjectMember(memberInput)
      db.projectMember.create.mockResolvedValueOnce(member)

      const result = await addProjectMemberQuery(memberInput)

      expect(db.projectMember.create).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(member)
    })
  })

  describe('updateProjectMemberQuery', () => {
    it('should update a project member role', async () => {
      const memberId = randomUUID()
      const member = mockProjectMember({ id: memberId, projectId: data.id, userId: randomUUID(), role: 'admin' })
      db.projectMember.update.mockResolvedValueOnce(member)

      const result = await updateProjectMemberQuery(memberId, 'admin')

      expect(db.projectMember.update).toHaveBeenCalledTimes(1)
      expect(result).toStrictEqual(member)
    })
  })

  describe('removeProjectMemberQuery', () => {
    it('should delete a project member', async () => {
      const memberId = randomUUID()
      const member = mockProjectMember({ id: memberId, projectId: data.id, userId: randomUUID() })
      db.projectMember.delete.mockResolvedValueOnce(member)

      await removeProjectMemberQuery(memberId)

      expect(db.projectMember.delete).toHaveBeenCalledTimes(1)
    })
  })

  describe('getProjectMemberByIdQuery', () => {
    it('should find a member by id', async () => {
      const memberId = randomUUID()
      const member = mockProjectMember({ id: memberId, projectId: data.id, userId: randomUUID() })
      db.projectMember.findUnique.mockResolvedValueOnce(member)

      const result = await getProjectMemberByIdQuery(memberId)

      expect(db.projectMember.findUnique).toHaveBeenCalledWith({ where: { id: memberId } })
      expect(result).toStrictEqual(member)
    })
  })

  describe('getProjectIdsForUser', () => {
    it('should return project IDs for a user', async () => {
      const userId = randomUUID()
      const projectId1 = randomUUID()
      const projectId2 = randomUUID()
      db.projectMember.findMany.mockResolvedValueOnce([
        { projectId: projectId1 } as never,
        { projectId: projectId2 } as never,
      ])

      const result = await getProjectIdsForUser(userId)

      expect(db.projectMember.findMany).toHaveBeenCalledWith({
        where: { userId },
        select: { projectId: true },
      })
      expect(result).toStrictEqual([projectId1, projectId2])
    })
  })

  describe('getOrgIdsForUser', () => {
    it('should return organization IDs for a user', async () => {
      const userId = randomUUID()
      const orgId1 = randomUUID()
      const orgId2 = randomUUID()
      db.member.findMany.mockResolvedValueOnce([
        { organizationId: orgId1 } as never,
        { organizationId: orgId2 } as never,
      ])

      const result = await getOrgIdsForUser(userId)

      expect(db.member.findMany).toHaveBeenCalledWith({
        where: { userId },
        select: { organizationId: true },
      })
      expect(result).toStrictEqual([orgId1, orgId2])
    })
  })

  describe('countProjects', () => {
    it('should count all projects when no filters provided', async () => {
      db.project.count.mockResolvedValueOnce(5)

      const count = await countProjects()

      expect(db.project.count).toHaveBeenCalledWith(undefined)
      expect(count).toBe(5)
    })

    it('should count projects with filters', async () => {
      db.project.count.mockResolvedValueOnce(2)

      const count = await countProjects({ ownerId: data.ownerId })

      expect(db.project.count).toHaveBeenCalledWith({ where: { ownerId: data.ownerId } })
      expect(count).toBe(2)
    })
  })

  describe('getProjectsQuery with accessibleBy', () => {
    it('should add OR conditions when accessibleBy is set', async () => {
      const userId = randomUUID()
      const memberProjectId = randomUUID()
      const orgId = randomUUID()

      // getProjectIdsForUser
      db.projectMember.findMany.mockResolvedValueOnce([{ projectId: memberProjectId } as never])
      // getOrgIdsForUser
      db.member.findMany.mockResolvedValueOnce([{ organizationId: orgId } as never])
      db.project.findMany.mockResolvedValueOnce([])

      await getProjectsQuery({ accessibleBy: userId })

      expect(db.project.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { ownerId: userId },
            { id: { in: [memberProjectId] } },
            { organizationId: { in: [orgId] } },
          ],
        },
      })
    })
  })
})
