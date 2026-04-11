import { randomUUID } from 'node:crypto'

import { mockProject, mockProjectMember } from '~/__mocks__/factories.js'
import { db } from '~/prisma/__mocks__/clients.js'
import { addProjectMemberQuery, countProjects, countProjectsInOrganization, countUserOrganizations, createProjectQuery, deleteProjectQuery, getOrgIdsForUser, getOrgIdsWithProjectAccess, getOrgMaxProjects, getProjectByIdQuery, getProjectByIdWithOwnerQuery, getProjectIdsForUser, getProjectMemberByIdQuery, getProjectMemberQuery, getProjectMemberRoleQuery, getProjectMembersQuery, getProjectsQuery, getUserByEmailQuery, getUserByIdQuery, isOrgMember, isPersonalOrg, removeProjectMemberQuery, updateProjectMemberQuery, updateProjectQuery } from './queries.js'

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

  const ownerInclude = { owner: { select: { id: true, name: true, email: true, image: true } } }

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

      expect(db.project.findMany).toHaveBeenCalledWith({ where: { ownerId: data.ownerId }, include: ownerInclude, orderBy: { createdAt: 'desc' } })
      expect(projects).toStrictEqual([full])
    })

    it('should filter projects by organizationId when provided', async () => {
      const orgId = randomUUID()
      const full = mockProject({ ...data, organizationId: orgId })
      db.project.findMany.mockResolvedValueOnce([full])

      const projects = await getProjectsQuery({ organizationId: orgId })

      expect(db.project.findMany).toHaveBeenCalledWith({ where: { organizationId: orgId }, include: ownerInclude, orderBy: { createdAt: 'desc' } })
      expect(projects).toStrictEqual([full])
    })

    it('should combine ownerId and organizationId filters', async () => {
      const orgId = randomUUID()
      const full = mockProject({ ...data, organizationId: orgId })
      db.project.findMany.mockResolvedValueOnce([full])

      const projects = await getProjectsQuery({ ownerId: data.ownerId, organizationId: orgId })

      expect(db.project.findMany).toHaveBeenCalledWith({ where: { ownerId: data.ownerId, organizationId: orgId }, include: ownerInclude, orderBy: { createdAt: 'desc' } })
      expect(projects).toStrictEqual([full])
    })

    it('should filter by description', async () => {
      const full = mockProject(data)
      db.project.findMany.mockResolvedValueOnce([full])

      await getProjectsQuery({ description: 'my project' })

      expect(db.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { description: { contains: 'my project', mode: 'insensitive' } },
      }))
    })

    it('should filter by date range', async () => {
      const full = mockProject(data)
      db.project.findMany.mockResolvedValueOnce([full])

      await getProjectsQuery({ after: '2026-01-01', before: '2026-12-31' })

      expect(db.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { createdAt: { gte: new Date('2026-01-01'), lte: new Date('2026-12-31') } },
      }))
    })

    it('should use pagination when limit and offset are provided', async () => {
      const full = mockProject(data)
      db.project.findMany.mockResolvedValueOnce([full])

      await getProjectsQuery({ limit: 10, offset: 20 })

      expect(db.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
        take: 10,
        skip: 20,
      }))
    })
  })

  describe('getProjectByIdQuery', () => {
    it('should get project by its ID', async () => {
      const full = mockProject(data)
      db.project.findUnique.mockResolvedValueOnce(full)

      const project = await getProjectByIdQuery(data.id)

      expect(db.project.findUnique).toHaveBeenCalledTimes(1)
      expect(db.project.findUnique).toHaveBeenCalledWith({ where: { id: data.id } })
      expect(project).toStrictEqual(full)
    })
  })

  describe('getProjectDetailQuery', () => {
    it('should get project with owner data', async () => {
      const full = mockProject(data)
      db.project.findUnique.mockResolvedValueOnce(full)

      const project = await getProjectByIdWithOwnerQuery(data.id)

      expect(db.project.findUnique).toHaveBeenCalledTimes(1)
      expect(db.project.findUnique).toHaveBeenCalledWith({
        where: { id: data.id },
        include: { owner: { select: { id: true, name: true, email: true, image: true } } },
      })
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
      db.project.findUnique.mockResolvedValueOnce({ ownerId: data.ownerId, members: memberData } as never)

      const result = await getProjectMembersQuery(projectId)

      expect(db.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        select: {
          ownerId: true,
          members: {
            orderBy: { createdAt: 'asc' },
            take: 1000,
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
          },
        },
      })
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

  describe('countUserOrganizations', () => {
    it('should count organizations a user belongs to', async () => {
      db.member.count.mockResolvedValueOnce(3)

      const count = await countUserOrganizations(data.ownerId)

      expect(db.member.count).toHaveBeenCalledWith({ where: { userId: data.ownerId } })
      expect(count).toBe(3)
    })
  })

  describe('countProjectsInOrganization', () => {
    it('should count projects in an organization', async () => {
      const orgId = randomUUID()
      db.project.count.mockResolvedValueOnce(7)

      const count = await countProjectsInOrganization(orgId)

      expect(db.project.count).toHaveBeenCalledWith({ where: { organizationId: orgId } })
      expect(count).toBe(7)
    })
  })

  describe('getProjectsQuery with accessibleBy', () => {
    it('should add OR conditions when accessibleBy is set', async () => {
      const userId = randomUUID()
      const memberProjectId = randomUUID()
      const orgId = randomUUID()

      // getProjectIdsForUser
      db.projectMember.findMany.mockResolvedValueOnce([{ projectId: memberProjectId } as never])
      // getOrgIdsWithProjectAccess — user is owner in this org
      db.member.findMany.mockResolvedValueOnce([{ organizationId: orgId, role: 'owner' } as never])
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
        include: ownerInclude,
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should exclude orgs where user is only a member (no project:read)', async () => {
      const userId = randomUUID()

      // getProjectIdsForUser — no project memberships
      db.projectMember.findMany.mockResolvedValueOnce([])
      // getOrgIdsWithProjectAccess — user is plain member (no project:read)
      db.member.findMany.mockResolvedValueOnce([{ organizationId: randomUUID(), role: 'member' } as never])
      db.project.findMany.mockResolvedValueOnce([])

      await getProjectsQuery({ accessibleBy: userId })

      expect(db.project.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { ownerId: userId },
          ],
        },
        include: ownerInclude,
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('getOrgMaxProjects', () => {
    it('should return null when organization has no metadata', async () => {
      db.organization.findUnique.mockResolvedValueOnce({ metadata: null } as never)

      const result = await getOrgMaxProjects('org-1')

      expect(result).toBeNull()
    })

    it('should return null when organization is not found', async () => {
      db.organization.findUnique.mockResolvedValueOnce(null)

      const result = await getOrgMaxProjects('org-1')

      expect(result).toBeNull()
    })

    it('should return maxProjects from metadata', async () => {
      db.organization.findUnique.mockResolvedValueOnce({ metadata: JSON.stringify({ maxProjects: 5 }) } as never)

      const result = await getOrgMaxProjects('org-1')

      expect(result).toBe(5)
    })

    it('should return 0 when maxProjects is explicitly 0', async () => {
      db.organization.findUnique.mockResolvedValueOnce({ metadata: JSON.stringify({ maxProjects: 0 }) } as never)

      const result = await getOrgMaxProjects('org-1')

      expect(result).toBe(0)
    })

    it('should return null when metadata has no maxProjects key', async () => {
      db.organization.findUnique.mockResolvedValueOnce({ metadata: JSON.stringify({ personal: true }) } as never)

      const result = await getOrgMaxProjects('org-1')

      expect(result).toBeNull()
    })

    it('should return null when metadata is invalid JSON', async () => {
      db.organization.findUnique.mockResolvedValueOnce({ metadata: 'not-json' } as never)

      const result = await getOrgMaxProjects('org-1')

      expect(result).toBeNull()
    })
  })

  describe('getUserByEmailQuery', () => {
    it('should find a user by email', async () => {
      const userId = randomUUID()
      db.user.findFirst.mockResolvedValueOnce({ id: userId } as never)

      const result = await getUserByEmailQuery('test@example.com')

      expect(db.user.findFirst).toHaveBeenCalledWith({ where: { email: 'test@example.com' }, select: { id: true } })
      expect(result).toStrictEqual({ id: userId })
    })

    it('should return null when no user matches', async () => {
      db.user.findFirst.mockResolvedValueOnce(null)

      const result = await getUserByEmailQuery('unknown@example.com')

      expect(result).toBeNull()
    })
  })

  describe('getOrgIdsWithProjectAccess', () => {
    it('should include orgs where user is owner or admin', async () => {
      const userId = randomUUID()
      const orgOwner = randomUUID()
      const orgAdmin = randomUUID()
      db.member.findMany.mockResolvedValueOnce([
        { organizationId: orgOwner, role: 'owner' } as never,
        { organizationId: orgAdmin, role: 'admin' } as never,
      ])

      const result = await getOrgIdsWithProjectAccess(userId)

      expect(result).toStrictEqual([orgOwner, orgAdmin])
    })

    it('should exclude orgs where user is plain member', async () => {
      const userId = randomUUID()
      db.member.findMany.mockResolvedValueOnce([
        { organizationId: randomUUID(), role: 'member' } as never,
      ])

      const result = await getOrgIdsWithProjectAccess(userId)

      expect(result).toStrictEqual([])
    })

    it('should include orgs via custom role with project:read', async () => {
      const userId = randomUUID()
      const orgId = randomUUID()
      db.member.findMany.mockResolvedValueOnce([
        { organizationId: orgId, role: 'custom-role' } as never,
      ])
      db.organizationRole.findMany.mockResolvedValueOnce([
        { organizationId: orgId, permission: JSON.stringify({ project: ['read', 'create'] }) } as never,
      ])

      const result = await getOrgIdsWithProjectAccess(userId)

      expect(result).toStrictEqual([orgId])
    })

    it('should include orgs via custom role with wildcard project permissions', async () => {
      const userId = randomUUID()
      const orgId = randomUUID()
      db.member.findMany.mockResolvedValueOnce([
        { organizationId: orgId, role: 'superuser' } as never,
      ])
      db.organizationRole.findMany.mockResolvedValueOnce([
        { organizationId: orgId, permission: JSON.stringify({ project: ['*'] }) } as never,
      ])

      const result = await getOrgIdsWithProjectAccess(userId)

      expect(result).toStrictEqual([orgId])
    })

    it('should include orgs via wildcard resource with read action', async () => {
      const userId = randomUUID()
      const orgId = randomUUID()
      db.member.findMany.mockResolvedValueOnce([
        { organizationId: orgId, role: 'universal-reader' } as never,
      ])
      db.organizationRole.findMany.mockResolvedValueOnce([
        { organizationId: orgId, permission: JSON.stringify({ '*': ['read'] }) } as never,
      ])

      const result = await getOrgIdsWithProjectAccess(userId)

      expect(result).toStrictEqual([orgId])
    })

    it('should include orgs via wildcard resource permissions', async () => {
      const userId = randomUUID()
      const orgId = randomUUID()
      db.member.findMany.mockResolvedValueOnce([
        { organizationId: orgId, role: 'full-access' } as never,
      ])
      db.organizationRole.findMany.mockResolvedValueOnce([
        { organizationId: orgId, permission: JSON.stringify({ '*': ['*'] }) } as never,
      ])

      const result = await getOrgIdsWithProjectAccess(userId)

      expect(result).toStrictEqual([orgId])
    })

    it('should exclude orgs with custom role lacking project:read', async () => {
      const userId = randomUUID()
      const orgId = randomUUID()
      db.member.findMany.mockResolvedValueOnce([
        { organizationId: orgId, role: 'auditor' } as never,
      ])
      db.organizationRole.findMany.mockResolvedValueOnce([
        { organizationId: orgId, permission: JSON.stringify({ audit: ['read'] }) } as never,
      ])

      const result = await getOrgIdsWithProjectAccess(userId)

      expect(result).toStrictEqual([])
    })

    it('should deduplicate org IDs', async () => {
      const userId = randomUUID()
      const orgId = randomUUID()
      db.member.findMany.mockResolvedValueOnce([
        { organizationId: orgId, role: 'owner' } as never,
      ])

      const result = await getOrgIdsWithProjectAccess(userId)

      expect(result).toStrictEqual([orgId])
    })

    it('should handle empty memberships', async () => {
      const userId = randomUUID()
      db.member.findMany.mockResolvedValueOnce([])

      const result = await getOrgIdsWithProjectAccess(userId)

      expect(result).toStrictEqual([])
    })

    it('should skip malformed permission JSON in custom roles', async () => {
      const userId = randomUUID()
      const orgId = randomUUID()
      db.member.findMany.mockResolvedValueOnce([
        { organizationId: orgId, role: 'broken-role' } as never,
      ])
      db.organizationRole.findMany.mockResolvedValueOnce([
        { organizationId: orgId, permission: 'not-valid-json' } as never,
      ])

      const result = await getOrgIdsWithProjectAccess(userId)

      expect(result).toStrictEqual([])
    })
  })

  describe('isPersonalOrg', () => {
    it('should return true for a personal organization', async () => {
      db.organization.findUnique.mockResolvedValueOnce({ metadata: JSON.stringify({ personal: true }) } as never)

      const result = await isPersonalOrg('org-1')

      expect(result).toBe(true)
    })

    it('should return false for a non-personal organization', async () => {
      db.organization.findUnique.mockResolvedValueOnce({ metadata: JSON.stringify({ personal: false }) } as never)

      const result = await isPersonalOrg('org-1')

      expect(result).toBe(false)
    })

    it('should return false when organization is not found', async () => {
      db.organization.findUnique.mockResolvedValueOnce(null)

      const result = await isPersonalOrg('org-1')

      expect(result).toBe(false)
    })

    it('should return false when metadata has no personal key', async () => {
      db.organization.findUnique.mockResolvedValueOnce({ metadata: JSON.stringify({ maxProjects: 5 }) } as never)

      const result = await isPersonalOrg('org-1')

      expect(result).toBe(false)
    })

    it('should return false when metadata is null', async () => {
      db.organization.findUnique.mockResolvedValueOnce({ metadata: null } as never)

      const result = await isPersonalOrg('org-1')

      expect(result).toBe(false)
    })
  })

  describe('getUserByIdQuery', () => {
    it('should find a user by ID', async () => {
      const userId = randomUUID()
      db.user.findUnique.mockResolvedValueOnce({ id: userId } as never)

      const result = await getUserByIdQuery(userId)

      expect(db.user.findUnique).toHaveBeenCalledWith({ where: { id: userId }, select: { id: true } })
      expect(result).toStrictEqual({ id: userId })
    })
  })

  describe('isOrgMember', () => {
    it('should return true when user is a member', async () => {
      db.member.count.mockResolvedValueOnce(1)

      const result = await isOrgMember('u-1', 'org-1')

      expect(db.member.count).toHaveBeenCalledWith({ where: { userId: 'u-1', organizationId: 'org-1' } })
      expect(result).toBe(true)
    })

    it('should return false when user is not a member', async () => {
      db.member.count.mockResolvedValueOnce(0)

      const result = await isOrgMember('u-1', 'org-1')

      expect(result).toBe(false)
    })
  })

  describe('getProjectMemberRoleQuery', () => {
    it('should return the role when user is a member', async () => {
      db.projectMember.findUnique.mockResolvedValueOnce({ role: 'admin' } as never)

      const result = await getProjectMemberRoleQuery('p-1', 'u-1')

      expect(db.projectMember.findUnique).toHaveBeenCalledWith({
        where: { projectId_userId: { projectId: 'p-1', userId: 'u-1' } },
        select: { role: true },
      })
      expect(result).toBe('admin')
    })

    it('should return null when user is not a member', async () => {
      db.projectMember.findUnique.mockResolvedValueOnce(null)

      const result = await getProjectMemberRoleQuery('p-1', 'u-1')

      expect(result).toBeNull()
    })
  })
})
