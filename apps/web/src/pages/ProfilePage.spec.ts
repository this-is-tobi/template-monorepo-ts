import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '~/stores/auth'
import { mockUser, mountPage } from '~/test/helpers'
import ProfilePage from './ProfilePage.vue'

describe('profilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render profile heading', async () => {
    const { wrapper } = await mountPage(ProfilePage, { route: '/profile' })
    expect(wrapper.text()).toContain('Profile')
  })

  it('should display user name', async () => {
    const { wrapper } = await mountPage(ProfilePage, { route: '/profile' })
    const auth = useAuthStore()
    auth.user = { ...mockUser }
    await flushPromises()
    expect(wrapper.text()).toContain('Test User')
  })

  it('should display user email', async () => {
    const { wrapper } = await mountPage(ProfilePage, { route: '/profile' })
    const auth = useAuthStore()
    auth.user = { ...mockUser }
    await flushPromises()
    expect(wrapper.text()).toContain('test@example.com')
  })

  it('should display user role', async () => {
    const { wrapper } = await mountPage(ProfilePage, { route: '/profile' })
    const auth = useAuthStore()
    auth.user = { ...mockUser, role: 'admin' }
    await flushPromises()
    expect(wrapper.text()).toContain('admin')
  })

  it('should display default role when not set', async () => {
    const { wrapper } = await mountPage(ProfilePage, { route: '/profile' })
    const auth = useAuthStore()
    auth.user = { id: '1', email: 'a@b.com', name: 'X' }
    await flushPromises()
    expect(wrapper.text()).toContain('user')
  })
})
