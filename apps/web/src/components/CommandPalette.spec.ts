import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '~/stores/auth'
import { useOrganizationsStore } from '~/stores/organizations'
import { mockAdminUser, mockUser, mountPage } from '~/test/helpers'
import CommandPalette from './CommandPalette.vue'

vi.mock('~/lib/auth', () => ({
  authClient: {
    getSession: vi.fn().mockResolvedValue({ data: null }),
    signOut: vi.fn().mockResolvedValue({}),
    useActiveOrganization: vi.fn().mockReturnValue({ value: null }),
    organization: {
      setActive: vi.fn().mockResolvedValue({}),
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
  },
}))

vi.mock('~/lib/api', () => ({
  apiClient: {},
}))

async function mountPalette(user: typeof mockUser | typeof mockAdminUser = mockUser) {
  const mounted = await mountPage(CommandPalette)
  const auth = useAuthStore()
  auth.user = { ...user } as typeof auth.user
  await flushPromises()
  return mounted
}

describe('commandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the trigger button with the shortcut hint', async () => {
    const { wrapper } = await mountPalette()
    const trigger = wrapper.find('button[aria-label="Open command palette"]')
    expect(trigger.exists()).toBe(true)
  })

  it('opens on the trigger click and lists navigation commands', async () => {
    const { wrapper } = await mountPalette()
    await wrapper.find('button[aria-label="Open command palette"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Dashboard')
    expect(wrapper.text()).toContain('Projects')
    expect(wrapper.text()).toContain('Sign out')
  })

  it('opens with the meta+k keyboard shortcut', async () => {
    const { wrapper } = await mountPalette()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    await flushPromises()

    expect(wrapper.find('input[aria-label="Search commands"]').exists()).toBe(true)
  })

  it('filters commands by query', async () => {
    const { wrapper } = await mountPalette()
    await wrapper.find('button[aria-label="Open command palette"]').trigger('click')

    const input = wrapper.find('input[aria-label="Search commands"]')
    await input.setValue('proj')
    await flushPromises()

    expect(wrapper.text()).toContain('Projects')
    expect(wrapper.text()).not.toContain('Sign out')
  })

  it('shows an empty state for unmatched queries', async () => {
    const { wrapper } = await mountPalette()
    await wrapper.find('button[aria-label="Open command palette"]').trigger('click')

    const input = wrapper.find('input[aria-label="Search commands"]')
    await input.setValue('zzzznope')
    await flushPromises()

    expect(wrapper.text()).toContain('No results')
  })

  it('hides admin commands from regular users', async () => {
    const { wrapper } = await mountPalette(mockUser)
    await wrapper.find('button[aria-label="Open command palette"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('All users')
    expect(wrapper.text()).not.toContain('Audit logs')
  })

  it('shows admin commands for platform admins', async () => {
    const { wrapper } = await mountPalette(mockAdminUser)
    await wrapper.find('button[aria-label="Open command palette"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('All users')
    expect(wrapper.text()).toContain('Audit logs')
  })

  it('lists organization switch commands from the store', async () => {
    const { wrapper } = await mountPalette()
    const orgs = useOrganizationsStore()
    orgs.organizations = [
      { id: 'org-1', name: 'Acme', slug: 'acme', createdAt: new Date() },
    ] as typeof orgs.organizations
    await wrapper.find('button[aria-label="Open command palette"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Switch to Acme')
  })

  it('navigates on enter for the selected command', async () => {
    const { wrapper, router } = await mountPalette()
    const push = vi.spyOn(router, 'push')
    await wrapper.find('button[aria-label="Open command palette"]').trigger('click')

    const input = wrapper.find('input[aria-label="Search commands"]')
    await input.setValue('projects')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/projects')
  })
})
