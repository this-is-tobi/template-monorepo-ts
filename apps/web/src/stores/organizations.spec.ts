import type { FullOrganization, Organization } from './organizations'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrganizationsStore } from './organizations'

const mockList = vi.fn()
const mockGetFullOrganization = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockInviteMember = vi.fn()
const mockRemoveMember = vi.fn()
const mockUpdateMemberRole = vi.fn()
const mockCancelInvitation = vi.fn()
const mockAcceptInvitation = vi.fn()
const mockRejectInvitation = vi.fn()
const mockListUserInvitations = vi.fn()

vi.mock('~/lib/auth', () => ({
  authClient: {
    organization: {
      list: (...args: unknown[]) => mockList(...args),
      getFullOrganization: (...args: unknown[]) => mockGetFullOrganization(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      inviteMember: (...args: unknown[]) => mockInviteMember(...args),
      removeMember: (...args: unknown[]) => mockRemoveMember(...args),
      updateMemberRole: (...args: unknown[]) => mockUpdateMemberRole(...args),
      cancelInvitation: (...args: unknown[]) => mockCancelInvitation(...args),
      acceptInvitation: (...args: unknown[]) => mockAcceptInvitation(...args),
      rejectInvitation: (...args: unknown[]) => mockRejectInvitation(...args),
      listUserInvitations: (...args: unknown[]) => mockListUserInvitations(...args),
    },
  },
}))

const mockOrg: Organization = {
  id: 'org-1',
  name: 'Test Org',
  slug: 'test-org',
  logo: null,
  metadata: null,
  createdAt: new Date('2026-01-01'),
}

const mockFullOrg: FullOrganization = {
  ...mockOrg,
  members: [
    { id: 'member-1', userId: 'user-1', organizationId: 'org-1', role: 'owner', createdAt: new Date('2026-01-01'), user: { id: 'user-1', name: 'Owner', email: 'owner@test.com', image: null } },
    { id: 'member-2', userId: 'user-2', organizationId: 'org-1', role: 'member', createdAt: new Date('2026-01-02'), user: { id: 'user-2', name: 'Member', email: 'member@test.com', image: null } },
  ],
  invitations: [
    { id: 'inv-1', email: 'invited@test.com', organizationId: 'org-1', role: 'member', status: 'pending', inviterId: 'user-1', expiresAt: new Date('2026-02-01'), createdAt: new Date('2026-01-01') },
  ],
}

describe('useOrganizationsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should start with empty state', () => {
    const store = useOrganizationsStore()
    expect(store.organizations).toEqual([])
    expect(store.currentOrganization).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('fetchOrganizations', () => {
    it('should populate organizations on success', async () => {
      mockList.mockResolvedValue({ data: [mockOrg], error: null })
      const store = useOrganizationsStore()
      await store.fetchOrganizations()
      expect(store.organizations).toEqual([mockOrg])
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should set error on API error', async () => {
      mockList.mockResolvedValue({ data: null, error: { message: 'Unauthorized' } })
      const store = useOrganizationsStore()
      await store.fetchOrganizations()
      expect(store.organizations).toEqual([])
      expect(store.error).toBe('Unauthorized')
    })

    it('should set error on exception', async () => {
      mockList.mockRejectedValue(new Error('Network error'))
      const store = useOrganizationsStore()
      await store.fetchOrganizations()
      expect(store.error).toBe('Network error')
    })
  })

  describe('fetchOrganization', () => {
    it('should set currentOrganization on success', async () => {
      mockGetFullOrganization.mockResolvedValue({ data: mockFullOrg, error: null })
      const store = useOrganizationsStore()
      await store.fetchOrganization('org-1')
      expect(store.currentOrganization).toEqual(mockFullOrg)
      expect(mockGetFullOrganization).toHaveBeenCalledWith({ query: { organizationId: 'org-1' } })
    })

    it('should set error on failure', async () => {
      mockGetFullOrganization.mockResolvedValue({ data: null, error: { message: 'Not found' } })
      const store = useOrganizationsStore()
      await store.fetchOrganization('bad-id')
      expect(store.currentOrganization).toBeNull()
      expect(store.error).toBe('Not found')
    })
  })

  describe('createOrganization', () => {
    it('should add organization to list on success', async () => {
      mockCreate.mockResolvedValue({ data: mockOrg, error: null })
      const store = useOrganizationsStore()
      const result = await store.createOrganization('Test Org', 'test-org')
      expect(result).toEqual(mockOrg)
      expect(store.organizations).toContainEqual(mockOrg)
    })

    it('should return null on API error', async () => {
      mockCreate.mockResolvedValue({ data: null, error: { message: 'Slug taken' } })
      const store = useOrganizationsStore()
      const result = await store.createOrganization('Test Org', 'test-org')
      expect(result).toBeNull()
      expect(store.error).toBe('Slug taken')
    })
  })

  describe('updateOrganization', () => {
    it('should update organization in list on success', async () => {
      const updated = { ...mockOrg, name: 'Updated Org' }
      mockUpdate.mockResolvedValue({ data: updated, error: null })
      const store = useOrganizationsStore()
      store.organizations = [{ ...mockOrg }]
      const result = await store.updateOrganization('org-1', { name: 'Updated Org' })
      expect(result).toEqual(updated)
      expect(store.organizations[0].name).toBe('Updated Org')
    })

    it('should update currentOrganization if it matches', async () => {
      const updated = { ...mockOrg, name: 'Updated Org' }
      mockUpdate.mockResolvedValue({ data: updated, error: null })
      const store = useOrganizationsStore()
      store.currentOrganization = { ...mockFullOrg }
      const result = await store.updateOrganization('org-1', { name: 'Updated Org' })
      expect(result).toEqual(updated)
      expect(store.currentOrganization!.name).toBe('Updated Org')
    })

    it('should return null on error', async () => {
      mockUpdate.mockResolvedValue({ data: null, error: { message: 'Forbidden' } })
      const store = useOrganizationsStore()
      const result = await store.updateOrganization('org-1', { name: 'x' })
      expect(result).toBeNull()
      expect(store.error).toBe('Forbidden')
    })
  })

  describe('deleteOrganization', () => {
    it('should remove organization from list on success', async () => {
      mockDelete.mockResolvedValue({ data: null, error: null })
      const store = useOrganizationsStore()
      store.organizations = [{ ...mockOrg }]
      const ok = await store.deleteOrganization('org-1')
      expect(ok).toBe(true)
      expect(store.organizations).toEqual([])
    })

    it('should clear currentOrganization if it matches', async () => {
      mockDelete.mockResolvedValue({ data: null, error: null })
      const store = useOrganizationsStore()
      store.currentOrganization = { ...mockFullOrg }
      await store.deleteOrganization('org-1')
      expect(store.currentOrganization).toBeNull()
    })

    it('should return false on error', async () => {
      mockDelete.mockResolvedValue({ data: null, error: { message: 'Forbidden' } })
      const store = useOrganizationsStore()
      const ok = await store.deleteOrganization('org-1')
      expect(ok).toBe(false)
      expect(store.error).toBe('Forbidden')
    })
  })

  describe('inviteMember', () => {
    it('should return invitation data on success', async () => {
      const inv = { id: 'inv-new' }
      mockInviteMember.mockResolvedValue({ data: inv, error: null })
      const store = useOrganizationsStore()
      const result = await store.inviteMember('org-1', 'new@test.com', 'member')
      expect(result).toEqual(inv)
    })

    it('should return null on error', async () => {
      mockInviteMember.mockResolvedValue({ data: null, error: { message: 'Already invited' } })
      const store = useOrganizationsStore()
      const result = await store.inviteMember('org-1', 'dup@test.com', 'member')
      expect(result).toBeNull()
      expect(store.error).toBe('Already invited')
    })
  })

  describe('removeMember', () => {
    it('should remove member from current organization on success', async () => {
      mockRemoveMember.mockResolvedValue({ data: null, error: null })
      const store = useOrganizationsStore()
      store.currentOrganization = { ...mockFullOrg, members: [...mockFullOrg.members] }
      const ok = await store.removeMember('member-2', 'org-1')
      expect(ok).toBe(true)
      expect(store.currentOrganization!.members).toHaveLength(1)
    })

    it('should return false on error', async () => {
      mockRemoveMember.mockResolvedValue({ data: null, error: { message: 'Cannot remove owner' } })
      const store = useOrganizationsStore()
      const ok = await store.removeMember('member-1', 'org-1')
      expect(ok).toBe(false)
      expect(store.error).toBe('Cannot remove owner')
    })
  })

  describe('updateMemberRole', () => {
    it('should update member role in current organization on success', async () => {
      mockUpdateMemberRole.mockResolvedValue({ data: null, error: null })
      const store = useOrganizationsStore()
      store.currentOrganization = { ...mockFullOrg, members: [...mockFullOrg.members.map(m => ({ ...m }))] }
      const ok = await store.updateMemberRole('member-2', 'admin', 'org-1')
      expect(ok).toBe(true)
      expect(store.currentOrganization!.members.find(m => m.id === 'member-2')?.role).toBe('admin')
    })

    it('should return false on error', async () => {
      mockUpdateMemberRole.mockResolvedValue({ data: null, error: { message: 'Forbidden' } })
      const store = useOrganizationsStore()
      const ok = await store.updateMemberRole('member-2', 'admin', 'org-1')
      expect(ok).toBe(false)
    })
  })

  describe('cancelInvitation', () => {
    it('should remove invitation from current organization on success', async () => {
      mockCancelInvitation.mockResolvedValue({ data: null, error: null })
      const store = useOrganizationsStore()
      store.currentOrganization = { ...mockFullOrg, invitations: [...mockFullOrg.invitations] }
      const ok = await store.cancelInvitation('inv-1')
      expect(ok).toBe(true)
      expect(store.currentOrganization!.invitations).toHaveLength(0)
    })

    it('should return false on error', async () => {
      mockCancelInvitation.mockResolvedValue({ data: null, error: { message: 'Not found' } })
      const store = useOrganizationsStore()
      const ok = await store.cancelInvitation('bad-id')
      expect(ok).toBe(false)
    })
  })

  describe('acceptInvitation', () => {
    it('should return true on success', async () => {
      mockAcceptInvitation.mockResolvedValue({ data: null, error: null })
      const store = useOrganizationsStore()
      const ok = await store.acceptInvitation('inv-1')
      expect(ok).toBe(true)
    })

    it('should remove invitation from userInvitations on success', async () => {
      mockAcceptInvitation.mockResolvedValue({ data: null, error: null })
      const store = useOrganizationsStore()
      store.userInvitations = [
        { id: 'inv-1', organizationId: 'org-1', organizationName: 'Org 1', email: 'a@b.com', role: 'member', status: 'pending', inviterId: 'user-1', expiresAt: new Date(), createdAt: new Date() },
        { id: 'inv-2', organizationId: 'org-2', organizationName: 'Org 2', email: 'a@b.com', role: 'member', status: 'pending', inviterId: 'user-1', expiresAt: new Date(), createdAt: new Date() },
      ] as never
      await store.acceptInvitation('inv-1')
      expect(store.userInvitations).toHaveLength(1)
      expect(store.userInvitations[0].id).toBe('inv-2')
    })

    it('should return false on error', async () => {
      mockAcceptInvitation.mockResolvedValue({ data: null, error: { message: 'Expired' } })
      const store = useOrganizationsStore()
      const ok = await store.acceptInvitation('inv-1')
      expect(ok).toBe(false)
      expect(store.error).toBe('Expired')
    })
  })

  describe('rejectInvitation', () => {
    it('should return true on success', async () => {
      mockRejectInvitation.mockResolvedValue({ data: null, error: null })
      const store = useOrganizationsStore()
      const ok = await store.rejectInvitation('inv-1')
      expect(ok).toBe(true)
    })

    it('should remove invitation from userInvitations on success', async () => {
      mockRejectInvitation.mockResolvedValue({ data: null, error: null })
      const store = useOrganizationsStore()
      store.userInvitations = [
        { id: 'inv-1', organizationId: 'org-1', organizationName: 'Org 1', email: 'a@b.com', role: 'member', status: 'pending', inviterId: 'user-1', expiresAt: new Date(), createdAt: new Date() },
      ] as never
      await store.rejectInvitation('inv-1')
      expect(store.userInvitations).toHaveLength(0)
    })

    it('should return false on error', async () => {
      mockRejectInvitation.mockResolvedValue({ data: null, error: { message: 'Already rejected' } })
      const store = useOrganizationsStore()
      const ok = await store.rejectInvitation('inv-1')
      expect(ok).toBe(false)
      expect(store.error).toBe('Already rejected')
    })
  })

  describe('fetchUserInvitations', () => {
    it('should populate userInvitations with pending invitations', async () => {
      mockListUserInvitations.mockResolvedValue({
        data: [
          { id: 'inv-1', organizationId: 'org-1', organizationName: 'Org 1', email: 'a@b.com', role: 'member', status: 'pending', inviterId: 'user-1', expiresAt: new Date(), createdAt: new Date() },
          { id: 'inv-2', organizationId: 'org-2', organizationName: 'Org 2', email: 'a@b.com', role: 'admin', status: 'accepted', inviterId: 'user-1', expiresAt: new Date(), createdAt: new Date() },
        ],
        error: null,
      })
      const store = useOrganizationsStore()
      await store.fetchUserInvitations()
      expect(store.userInvitations).toHaveLength(1)
      expect(store.userInvitations[0].id).toBe('inv-1')
    })

    it('should set error on API failure', async () => {
      mockListUserInvitations.mockResolvedValue({ data: null, error: { message: 'Unauthorized' } })
      const store = useOrganizationsStore()
      await store.fetchUserInvitations()
      expect(store.error).toBe('Unauthorized')
    })
  })
})
