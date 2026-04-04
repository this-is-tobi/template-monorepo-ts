import type { Invitation, InvitationStatus, Member, Organization } from 'better-auth/plugins/organization'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authClient } from '~/lib/auth'

/** Member enriched with nested user data, as returned by getFullOrganization. */
export interface MemberWithUser extends Member {
  user: { id: string, name: string, email: string, image?: string | null }
}

/** Organization with its members (including nested user) and invitations. */
export interface FullOrganization extends Organization {
  members: MemberWithUser[]
  invitations: Invitation[]
}

export type { Invitation, InvitationStatus, Member, Organization }

export const useOrganizationsStore = defineStore('organizations', () => {
  const organizations = ref<Organization[]>([])
  const currentOrganization = ref<FullOrganization | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchOrganizations() {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await authClient.organization.list()
      if (fetchError) {
        error.value = fetchError.message ?? 'Failed to fetch organizations'
      } else {
        organizations.value = data ?? []
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch organizations'
    } finally {
      loading.value = false
    }
  }

  async function fetchOrganization(organizationId: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await authClient.organization.getFullOrganization({
        query: { organizationId },
      })
      if (fetchError) {
        error.value = fetchError.message ?? 'Failed to fetch organization'
        currentOrganization.value = null
      } else {
        currentOrganization.value = data as FullOrganization | null
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch organization'
      currentOrganization.value = null
    } finally {
      loading.value = false
    }
  }

  async function createOrganization(name: string, slug: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: createError } = await authClient.organization.create({ name, slug })
      if (createError) {
        error.value = createError.message ?? 'Failed to create organization'
        return null
      }
      if (data) organizations.value.push(data as Organization)
      return data as Organization | null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create organization'
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateOrganization(organizationId: string, data: { name?: string, slug?: string, logo?: string, metadata?: Record<string, unknown> }) {
    loading.value = true
    error.value = null
    try {
      const { data: updated, error: updateError } = await authClient.organization.update({
        organizationId,
        data,
      })
      if (updateError) {
        error.value = updateError.message ?? 'Failed to update organization'
        return null
      }
      const idx = organizations.value.findIndex(o => o.id === organizationId)
      if (idx !== -1 && updated) organizations.value[idx] = updated as Organization
      if (currentOrganization.value?.id === organizationId && updated) {
        currentOrganization.value = { ...currentOrganization.value, ...updated }
      }
      return updated as Organization | null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update organization'
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteOrganization(organizationId: string) {
    loading.value = true
    error.value = null
    try {
      const { error: deleteError } = await authClient.organization.delete({ organizationId })
      if (deleteError) {
        error.value = deleteError.message ?? 'Failed to delete organization'
        return false
      }
      organizations.value = organizations.value.filter(o => o.id !== organizationId)
      if (currentOrganization.value?.id === organizationId) currentOrganization.value = null
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete organization'
      return false
    } finally {
      loading.value = false
    }
  }

  async function inviteMember(organizationId: string, email: string, role: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: inviteError } = await authClient.organization.inviteMember({
        organizationId,
        email,
        role: role as 'admin' | 'member' | 'owner',
      })
      if (inviteError) {
        error.value = inviteError.message ?? 'Failed to invite member'
        return null
      }
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to invite member'
      return null
    } finally {
      loading.value = false
    }
  }

  async function removeMember(memberIdOrEmail: string, organizationId: string) {
    loading.value = true
    error.value = null
    try {
      const { error: removeError } = await authClient.organization.removeMember({
        memberIdOrEmail,
        organizationId,
      })
      if (removeError) {
        error.value = removeError.message ?? 'Failed to remove member'
        return false
      }
      if (currentOrganization.value) {
        currentOrganization.value.members = currentOrganization.value.members.filter(
          m => m.id !== memberIdOrEmail && m.userId !== memberIdOrEmail,
        )
      }
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to remove member'
      return false
    } finally {
      loading.value = false
    }
  }

  async function updateMemberRole(memberId: string, role: string, organizationId: string) {
    loading.value = true
    error.value = null
    try {
      const { error: updateError } = await authClient.organization.updateMemberRole({
        memberId,
        role: role as 'admin' | 'member' | 'owner',
        organizationId,
      })
      if (updateError) {
        error.value = updateError.message ?? 'Failed to update member role'
        return false
      }
      if (currentOrganization.value) {
        const member = currentOrganization.value.members.find(m => m.id === memberId)
        if (member) member.role = role
      }
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update member role'
      return false
    } finally {
      loading.value = false
    }
  }

  async function cancelInvitation(invitationId: string) {
    loading.value = true
    error.value = null
    try {
      const { error: cancelError } = await authClient.organization.cancelInvitation({
        invitationId,
      })
      if (cancelError) {
        error.value = cancelError.message ?? 'Failed to cancel invitation'
        return false
      }
      if (currentOrganization.value) {
        currentOrganization.value.invitations = currentOrganization.value.invitations.filter(
          i => i.id !== invitationId,
        )
      }
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to cancel invitation'
      return false
    } finally {
      loading.value = false
    }
  }

  async function acceptInvitation(invitationId: string) {
    loading.value = true
    error.value = null
    try {
      const { error: acceptError } = await authClient.organization.acceptInvitation({ invitationId })
      if (acceptError) {
        error.value = acceptError.message ?? 'Failed to accept invitation'
        return false
      }
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to accept invitation'
      return false
    } finally {
      loading.value = false
    }
  }

  async function rejectInvitation(invitationId: string) {
    loading.value = true
    error.value = null
    try {
      const { error: rejectError } = await authClient.organization.rejectInvitation({ invitationId })
      if (rejectError) {
        error.value = rejectError.message ?? 'Failed to reject invitation'
        return false
      }
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to reject invitation'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    organizations,
    currentOrganization,
    loading,
    error,
    fetchOrganizations,
    fetchOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    inviteMember,
    removeMember,
    updateMemberRole,
    cancelInvitation,
    acceptInvitation,
    rejectInvitation,
  }
})
