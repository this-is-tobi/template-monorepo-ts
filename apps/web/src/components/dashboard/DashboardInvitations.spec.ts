import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrganizationsStore } from '~/stores/organizations'
import { mountPage } from '~/test/helpers'
import DashboardInvitations from './DashboardInvitations.vue'

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

  it('should accept an invitation', async () => {
    const { wrapper } = await mountPage(DashboardInvitations)
    const store = useOrganizationsStore()
    store.userInvitations = [invitation] as never
    store.acceptInvitation = vi.fn().mockResolvedValue(undefined)
    await flushPromises()

    await wrapper.findAll('button')[0]?.trigger('click')

    expect(store.acceptInvitation).toHaveBeenCalledWith('inv-1')
  })

  it('should decline an invitation', async () => {
    const { wrapper } = await mountPage(DashboardInvitations)
    const store = useOrganizationsStore()
    store.userInvitations = [invitation] as never
    store.rejectInvitation = vi.fn().mockResolvedValue(undefined)
    await flushPromises()

    await wrapper.findAll('button')[1]?.trigger('click')

    expect(store.rejectInvitation).toHaveBeenCalledWith('inv-1')
  })
})
