import { apiPrefix } from '../api-client/utils.js'
import { projectRoutes } from './projects.js'

describe('routes/projects', () => {
  describe('route definitions', () => {
    it('should have createProject route configured correctly', () => {
      const route = projectRoutes.createProject

      expect(route.method).toBe('POST')
      expect(route.path).toBe(`${apiPrefix.v1}/projects`)
      expect(route.tags).toEqual(['Projects'])
    })

    it('should have getProjects route configured correctly', () => {
      const route = projectRoutes.getProjects

      expect(route.method).toBe('GET')
      expect(route.path).toBe(`${apiPrefix.v1}/projects`)
      expect(route.summary).toBe('Get projects')
      expect(route.description).toBe('Retrieve all projects.')
      expect(route.tags).toEqual(['Projects'])
    })

    it('should have getProjectById route configured correctly', () => {
      const route = projectRoutes.getProjectById

      expect(route.method).toBe('GET')
      expect(route.path).toBe(`${apiPrefix.v1}/projects/:id`)
      expect(route.tags).toEqual(['Projects'])
    })

    it('should have updateProject route configured correctly', () => {
      const route = projectRoutes.updateProject

      expect(route.method).toBe('PUT')
      expect(route.path).toBe(`${apiPrefix.v1}/projects/:id`)
      expect(route.tags).toEqual(['Projects'])
    })

    it('should have deleteProject route configured correctly', () => {
      const route = projectRoutes.deleteProject

      expect(route.method).toBe('DELETE')
      expect(route.path).toBe(`${apiPrefix.v1}/projects/:id`)
      expect(route.tags).toEqual(['Projects'])
    })

    it('should have all expected routes defined', () => {
      const expectedRoutes = ['createProject', 'getProjects', 'getProjectById', 'updateProject', 'deleteProject']

      expectedRoutes.forEach((routeName) => {
        expect(projectRoutes).toHaveProperty(routeName)
      })
    })

    it('should have correct HTTP methods for each route', () => {
      expect(projectRoutes.getProjects.method).toBe('GET')
      expect(projectRoutes.getProjectById.method).toBe('GET')
      expect(projectRoutes.createProject.method).toBe('POST')
      expect(projectRoutes.updateProject.method).toBe('PUT')
      expect(projectRoutes.deleteProject.method).toBe('DELETE')
    })

    it('should have correct paths for collection vs member routes', () => {
      expect(projectRoutes.createProject.path).toBe(`${apiPrefix.v1}/projects`)
      expect(projectRoutes.getProjects.path).toBe(`${apiPrefix.v1}/projects`)
      expect(projectRoutes.getProjectById.path).toBe(`${apiPrefix.v1}/projects/:id`)
      expect(projectRoutes.updateProject.path).toBe(`${apiPrefix.v1}/projects/:id`)
      expect(projectRoutes.deleteProject.path).toBe(`${apiPrefix.v1}/projects/:id`)
    })
  })

  describe('project member routes', () => {
    it('getProjectMembers has correct method and path', () => {
      expect(projectRoutes.getProjectMembers.method).toBe('GET')
      expect(projectRoutes.getProjectMembers.path).toBe(`${apiPrefix.v1}/projects/:id/members`)
    })

    it('getProjectMembers has params and query schemas', () => {
      expect(projectRoutes.getProjectMembers.params).toBeDefined()
      expect(projectRoutes.getProjectMembers.query).toBeDefined()
    })

    it('addProjectMember has correct method and path', () => {
      expect(projectRoutes.addProjectMember.method).toBe('POST')
      expect(projectRoutes.addProjectMember.path).toBe(`${apiPrefix.v1}/projects/:id/members`)
    })

    it('addProjectMember has params and body schemas', () => {
      expect(projectRoutes.addProjectMember.params).toBeDefined()
      expect(projectRoutes.addProjectMember.body).toBeDefined()
    })

    it('updateProjectMember has correct method and path', () => {
      expect(projectRoutes.updateProjectMember.method).toBe('PUT')
      expect(projectRoutes.updateProjectMember.path).toBe(`${apiPrefix.v1}/projects/:id/members/:memberId`)
    })

    it('removeProjectMember has correct method and path', () => {
      expect(projectRoutes.removeProjectMember.method).toBe('DELETE')
      expect(projectRoutes.removeProjectMember.path).toBe(`${apiPrefix.v1}/projects/:id/members/:memberId`)
    })

    it('all member routes are tagged Projects', () => {
      for (const key of ['getProjectMembers', 'addProjectMember', 'updateProjectMember', 'removeProjectMember'] as const) {
        expect(projectRoutes[key].tags).toContain('Projects')
      }
    })
  })
})
