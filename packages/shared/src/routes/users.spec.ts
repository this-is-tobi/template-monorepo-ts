import { userRoutes } from './users.js'

describe('routes/users', () => {
  describe('userRoutes', () => {
    it('should have createUser route configured correctly', () => {
      const route = userRoutes.createUser

      expect(route.method).toBe('POST')
      expect(route.path).toBe('/api/v1/users')
      expect(route.summary).toBe('Create user')
      expect(route.description).toBe('Create new user.')
      expect(route.tags).toEqual(['Users'])
      expect(route.body).toBeDefined()
      expect(route.responses).toBeDefined()
    })

    it('should have getUsers route configured correctly', () => {
      const route = userRoutes.getUsers

      expect(route.method).toBe('GET')
      expect(route.path).toBe('/api/v1/users')
      expect(route.summary).toBe('Get users')
      expect(route.description).toBe('Retrieved all users.')
      expect(route.tags).toEqual(['Users'])
      expect(route.responses).toBeDefined()
    })

    it('should have getUserById route configured correctly', () => {
      const route = userRoutes.getUserById

      expect(route.method).toBe('GET')
      expect(route.path).toBe('/api/v1/users/:id')
      expect(route.summary).toBe('Get user')
      expect(route.description).toBe('Retrieved user by id.')
      expect(route.tags).toEqual(['Users'])
      expect(route.params).toBeDefined()
      expect(route.responses).toBeDefined()
    })

    it('should have updateUser route configured correctly', () => {
      const route = userRoutes.updateUser

      expect(route.method).toBe('PUT')
      expect(route.path).toBe('/api/v1/users/:id')
      expect(route.summary).toBe('Update user')
      expect(route.description).toBe('Update user by id.')
      expect(route.tags).toEqual(['Users'])
      expect(route.params).toBeDefined()
      expect(route.body).toBeDefined()
      expect(route.responses).toBeDefined()
    })

    it('should have deleteUser route configured correctly', () => {
      const route = userRoutes.deleteUser

      expect(route.method).toBe('DELETE')
      expect(route.path).toBe('/api/v1/users/:id')
      expect(route.summary).toBe('Delete user')
      expect(route.description).toBe('Delete user by id.')
      expect(route.tags).toEqual(['Users'])
      expect(route.params).toBeDefined()
      expect(route.responses).toBeDefined()
    })

    it('should have all expected routes', () => {
      const expectedRoutes = ['createUser', 'getUsers', 'getUserById', 'updateUser', 'deleteUser']
      expect(Object.keys(userRoutes)).toEqual(expectedRoutes)
    })

    it('should have all required route properties', () => {
      Object.values(userRoutes).forEach((route) => {
        expect(route).toHaveProperty('method')
        expect(route).toHaveProperty('path')
        expect(route).toHaveProperty('summary')
        expect(route).toHaveProperty('description')
        expect(route).toHaveProperty('tags')
        expect(route).toHaveProperty('responses')
      })
    })

    it('should use correct HTTP methods', () => {
      expect(userRoutes.createUser.method).toBe('POST')
      expect(userRoutes.getUsers.method).toBe('GET')
      expect(userRoutes.getUserById.method).toBe('GET')
      expect(userRoutes.updateUser.method).toBe('PUT')
      expect(userRoutes.deleteUser.method).toBe('DELETE')
    })

    it('should use correct API paths', () => {
      expect(userRoutes.createUser.path).toBe('/api/v1/users')
      expect(userRoutes.getUsers.path).toBe('/api/v1/users')
      expect(userRoutes.getUserById.path).toBe('/api/v1/users/:id')
      expect(userRoutes.updateUser.path).toBe('/api/v1/users/:id')
      expect(userRoutes.deleteUser.path).toBe('/api/v1/users/:id')
    })
  })
})
