import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRolesStore } from './roles'

const mock$fetch = vi.fn()

vi.mock('~/lib/auth', () => ({
  authClient: {
    $fetch: (...args: unknown[]) => mock$fetch(...args),
  },
}))

const mockRole = {
  id: 'role-1',
  organizationId: 'org-1',
  role: 'editor',
  permission: { project: ['read', 'update'] },
  createdAt: new Date(),
}

describe('rolesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('fetchRoles', () => {
    it('should fetch roles for an organization', async () => {
      mock$fetch.mockResolvedValue({ data: [mockRole], error: null })
      const store = useRolesStore()

      await store.fetchRoles('org-1')

      expect(mock$fetch).toHaveBeenCalledWith('/organization/list-roles', {
        method: 'GET',
        body: undefined,
        query: { organizationId: 'org-1' },
      })
      expect(store.roles).toEqual([mockRole])
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should handle fetch error from API', async () => {
      mock$fetch.mockResolvedValue({ data: null, error: { message: 'Forbidden' } })
      const store = useRolesStore()

      await store.fetchRoles('org-1')

      expect(store.roles).toEqual([])
      expect(store.error).toBe('Forbidden')
    })

    it('should handle unexpected exception', async () => {
      mock$fetch.mockRejectedValue(new Error('Network error'))
      const store = useRolesStore()

      await store.fetchRoles('org-1')

      expect(store.error).toBe('Network error')
      expect(store.loading).toBe(false)
    })
  })

  describe('createRole', () => {
    it('should create a role and add to list', async () => {
      mock$fetch.mockResolvedValue({ data: { roleData: mockRole }, error: null })
      const store = useRolesStore()

      const result = await store.createRole('org-1', 'editor', { project: ['read', 'update'] })

      expect(mock$fetch).toHaveBeenCalledWith('/organization/create-role', {
        method: 'POST',
        body: { organizationId: 'org-1', role: 'editor', permission: { project: ['read', 'update'] } },
        query: undefined,
      })
      expect(result).toEqual(mockRole)
      expect(store.roles).toContainEqual(mockRole)
    })

    it('should send a description as an additional field', async () => {
      // BetterAuth nests additional fields on create and flattens them into
      // `data` on update — an asymmetry that is silent when you get it wrong.
      mock$fetch.mockResolvedValue({ data: { roleData: mockRole }, error: null })
      const store = useRolesStore()

      await store.createRole('org-1', 'editor', { project: ['read'] }, 'Edits content.')

      expect(mock$fetch).toHaveBeenCalledWith('/organization/create-role', {
        method: 'POST',
        body: {
          organizationId: 'org-1',
          role: 'editor',
          permission: { project: ['read'] },
          additionalFields: { description: 'Edits content.' },
        },
        query: undefined,
      })
    })

    it('should omit the field entirely when no description is given', async () => {
      mock$fetch.mockResolvedValue({ data: { roleData: mockRole }, error: null })
      const store = useRolesStore()

      await store.createRole('org-1', 'editor', { project: ['read'] })

      expect(mock$fetch.mock.calls[0]![1].body).not.toHaveProperty('additionalFields')
    })

    it('should handle create error', async () => {
      mock$fetch.mockResolvedValue({ data: null, error: { message: 'Duplicate role' } })
      const store = useRolesStore()

      const result = await store.createRole('org-1', 'editor', {})

      expect(result).toBeNull()
      expect(store.error).toBe('Duplicate role')
    })

    it('should handle unexpected exception', async () => {
      mock$fetch.mockRejectedValue(new Error('Timeout'))
      const store = useRolesStore()

      const result = await store.createRole('org-1', 'editor', {})

      expect(result).toBeNull()
      expect(store.error).toBe('Timeout')
    })
  })

  describe('updateRole', () => {
    // BetterAuth checks a new role name against every role in the org without
    // excluding the one being updated, so resending a role's own name always
    // comes back "already taken" — which made editing a role's permissions or
    // description impossible unless it was renamed at the same time.
    it('should drop an unchanged role name so the update is not rejected', async () => {
      mock$fetch.mockResolvedValue({ data: { roleData: mockRole }, error: null })
      const store = useRolesStore()
      store.roles = [mockRole]

      await store.updateRole('org-1', 'role-1', {
        roleName: 'editor',
        description: 'Edits content.',
      })

      expect(mock$fetch.mock.calls[0]![1].body.data).toEqual({ description: 'Edits content.' })
    })

    it('should send the role name when it really changed', async () => {
      mock$fetch.mockResolvedValue({ data: { roleData: mockRole }, error: null })
      const store = useRolesStore()
      store.roles = [mockRole]

      await store.updateRole('org-1', 'role-1', { roleName: 'publisher' })

      expect(mock$fetch.mock.calls[0]![1].body.data).toEqual({ roleName: 'publisher' })
    })

    it('should keep the name when the role is not in the local list', async () => {
      // Nothing to compare against, so deciding it is unchanged would silently
      // drop a rename the caller asked for.
      mock$fetch.mockResolvedValue({ data: { roleData: mockRole }, error: null })
      const store = useRolesStore()
      store.roles = []

      await store.updateRole('org-1', 'role-1', { roleName: 'editor' })

      expect(mock$fetch.mock.calls[0]![1].body.data).toEqual({ roleName: 'editor' })
    })

    it('should carry a description through, including clearing it', async () => {
      mock$fetch.mockResolvedValue({ data: { roleData: mockRole }, error: null })
      const store = useRolesStore()
      store.roles = [mockRole]

      await store.updateRole('org-1', 'role-1', { description: null })

      expect(mock$fetch.mock.calls[0]![1].body.data).toEqual({ description: null })
    })

    it('should update a role and replace in list', async () => {
      const updated = { ...mockRole, permission: { project: ['read', 'update', 'delete'] } }
      mock$fetch.mockResolvedValue({ data: { roleData: updated }, error: null })
      const store = useRolesStore()
      store.roles = [mockRole]

      const result = await store.updateRole('org-1', 'role-1', {
        permission: { project: ['read', 'update', 'delete'] },
      })

      expect(mock$fetch).toHaveBeenCalledWith('/organization/update-role', {
        method: 'POST',
        body: {
          organizationId: 'org-1',
          roleId: 'role-1',
          data: { permission: { project: ['read', 'update', 'delete'] } },
        },
        query: undefined,
      })
      expect(result).toEqual(updated)
      expect(store.roles[0]).toEqual(updated)
    })

    it('should handle update error', async () => {
      mock$fetch.mockResolvedValue({ data: null, error: { message: 'Not found' } })
      const store = useRolesStore()

      const result = await store.updateRole('org-1', 'role-1', { permission: {} })

      expect(result).toBeNull()
      expect(store.error).toBe('Not found')
    })
  })

  describe('deleteRole', () => {
    it('should delete a role and remove from list', async () => {
      mock$fetch.mockResolvedValue({ data: { success: true }, error: null })
      const store = useRolesStore()
      store.roles = [mockRole]

      const result = await store.deleteRole('org-1', 'role-1')

      expect(mock$fetch).toHaveBeenCalledWith('/organization/delete-role', {
        method: 'POST',
        body: { organizationId: 'org-1', roleId: 'role-1' },
        query: undefined,
      })
      expect(result).toBe(true)
      expect(store.roles).toEqual([])
    })

    it('should handle delete error', async () => {
      mock$fetch.mockResolvedValue({ data: null, error: { message: 'In use' } })
      const store = useRolesStore()
      store.roles = [mockRole]

      const result = await store.deleteRole('org-1', 'role-1')

      expect(result).toBe(false)
      expect(store.error).toBe('In use')
      expect(store.roles).toEqual([mockRole])
    })
  })
})
