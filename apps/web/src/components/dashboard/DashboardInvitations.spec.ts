import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrganizationsStore } from '~/stores/organizations'
import { mountPage } from '~/test/helpers'
import DashboardInvitations from './DashboardInvitations.vue'

const { mockNotify } = vi.hoisted(() => ({
  mockNotify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('~/composables/useNotify', () => ({ useNotify: () => mockNotify }))
vi.mock('~/lib/auth', () => ({
  authClient: {
    organization: {
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      listUserInvitations: vi.fn().mockResolvedValue({ data: [], error: null }),
      acceptInvitation: vi.fn().mockResolvedValue({ data: {}, error: null }),
      rejectInvitation: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}))

const invitation = {
  id: 'inv-1',
  organizationId: 'org-1',
  organizationName: 'Acme',
  email: 'a@b.com',
  role: 'member',
  status: 'pending',
  inviterId: 'u-1',
  expiresAt: new Date(),
  createdAt: new Date(),
}

describe('dashboardInvitations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should list pending invitations with accept and decline actions', async () => {
    const { wrapper } = await mountPage(DashboardInvitations)
    const store = useOrganizationsStore()
    store.userInvitations = [invitation] as never
    await flushPromises()

    expect(wrapper.text()).toContain('Pending invitations')
    expect(wrapper.text()).toContain('Acme')
    expect(wrapper.text()).toContain('Accept')
    expect(wrapper.text()).toContain('Decline')
  })

  it('should render nothing when there is nothing to act on', async () => {
    const { wrapper } = await mountPage(DashboardInvitations)
    const store = useOrganizationsStore()
    store.userInvitations = []
    await flushPromises()

    expect(wrapper.text()).not.toContain('Pending invitations')
  })

  it('should accept an invitation and refresh the organizations it joined', async () => {
    const { wrapper } = await mountPage(DashboardInvitations)
    const store = useOrganizationsStore()
    store.userInvitations = [invitation] as never
    store.acceptInvitation = vi.fn().mockResolvedValue(true)
    store.fetchOrganizations = vi.fn().mockResolvedValue(undefined)
    await flushPromises()

    await wrapper.findAll('button')[0]?.trigger('click')
    await flushPromises()

    expect(store.acceptInvitation).toHaveBeenCalledWith('inv-1')
    expect(store.fetchOrganizations).toHaveBeenCalled()
    expect(mockNotify.success).toHaveBeenCalledWith('Invitation accepted')
  })

  it('should decline an invitation', async () => {
    const { wrapper } = await mountPage(DashboardInvitations)
    const store = useOrganizationsStore()
    store.userInvitations = [invitation] as never
    store.rejectInvitation = vi.fn().mockResolvedValue(true)
    await flushPromises()

    await wrapper.findAll('button')[1]?.trigger('click')

    expect(store.rejectInvitation).toHaveBeenCalledWith('inv-1')
  })

  // The store swallows failures into `error`, so an unconditional toast told
  // people their invitation was accepted while it sat in the list untouched.
  it.each([
    ['accept', 0, 'acceptInvitation', 'Could not accept invitation'],
    ['decline', 1, 'rejectInvitation', 'Could not decline invitation'],
  ])('should report a failed %s instead of claiming success', async (_label, button, action, message) => {
    const { wrapper } = await mountPage(DashboardInvitations)
    const store = useOrganizationsStore()
    store.userInvitations = [invitation] as never
    store[action as 'acceptInvitation'] = vi.fn().mockResolvedValue(false)
    store.error = 'You are not the recipient of the invitation'
    await flushPromises()

    await wrapper.findAll('button')[button]?.trigger('click')
    await flushPromises()

    expect(mockNotify.success).not.toHaveBeenCalled()
    expect(mockNotify.info).not.toHaveBeenCalled()
    expect(mockNotify.error).toHaveBeenCalledWith(message, 'You are not the recipient of the invitation')
  })
})
