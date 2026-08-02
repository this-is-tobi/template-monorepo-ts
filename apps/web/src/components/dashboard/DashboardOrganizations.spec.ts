import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrganizationsStore } from '~/stores/organizations'
import { mountPage } from '~/test/helpers'
import DashboardOrganizations from './DashboardOrganizations.vue'

vi.mock('~/lib/auth', () => ({
  authClient: {
    organization: {
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      listUserInvitations: vi.fn().mockResolvedValue({ data: [], error: null }),
    },
  },
}))

describe('dashboardOrganizations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should prompt to create one when the user has no organizations', async () => {
    const { wrapper } = await mountPage(DashboardOrganizations)
    await flushPromises()
    expect(wrapper.text()).toContain('Not a member of any organization')
  })

  it('should show the slug for a regular organization', async () => {
    const { wrapper } = await mountPage(DashboardOrganizations)
    const store = useOrganizationsStore()
    store.organizations = [{ id: 'org-1', name: 'Acme Corp', slug: 'acme' }] as never
    await flushPromises()

    expect(wrapper.text()).toContain('Acme Corp')
    expect(wrapper.text()).toContain('acme')
  })

  it('should label the auto-created personal org instead of leaking its uuid slug', async () => {
    const { wrapper } = await mountPage(DashboardOrganizations)
    const store = useOrganizationsStore()
    store.organizations = [
      { id: 'org-2', name: 'Admin', slug: 'personal-20f595c4-d226-45b5-878e-11b0952caefb' },
    ] as never
    await flushPromises()

    expect(wrapper.text()).toContain('Personal')
    expect(wrapper.text()).not.toContain('20f595c4')
  })
})
