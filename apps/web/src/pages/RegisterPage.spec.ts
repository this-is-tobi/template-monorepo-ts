import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/config'
import { mountPage } from '~/test/helpers'
import RegisterPage from './RegisterPage.vue'

describe('registerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render registration form when enabled', async () => {
    const { wrapper } = await mountPage(RegisterPage, { route: '/register' })
    const configStore = useConfigStore()
    configStore.config = { enableRegistration: true }
    await flushPromises()
    expect(wrapper.text()).toContain('Create an account')
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('should show warning when registration is disabled', async () => {
    const { wrapper } = await mountPage(RegisterPage, { route: '/register' })
    const configStore = useConfigStore()
    configStore.config = { enableRegistration: false }
    await flushPromises()
    expect(wrapper.text()).toContain('Registration is currently disabled')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('should call signUp on form submit', async () => {
    const { wrapper } = await mountPage(RegisterPage, { route: '/register' })
    const auth = useAuthStore()
    const configStore = useConfigStore()
    configStore.config = { enableRegistration: true }
    auth.signUp = vi.fn().mockResolvedValue(true)
    await flushPromises()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(auth.signUp).toHaveBeenCalledWith('', '', '')
  })

  it('should show loading state during registration', async () => {
    const { wrapper } = await mountPage(RegisterPage, { route: '/register' })
    const auth = useAuthStore()
    const configStore = useConfigStore()
    configStore.config = { enableRegistration: true }
    auth.loading = true
    await flushPromises()
    expect(wrapper.text()).toContain('Creating account...')
  })

  it('should display auth error', async () => {
    const { wrapper } = await mountPage(RegisterPage, { route: '/register' })
    const auth = useAuthStore()
    const configStore = useConfigStore()
    configStore.config = { enableRegistration: true }
    auth.error = 'Email already exists'
    await flushPromises()
    expect(wrapper.text()).toContain('Email already exists')
  })

  it('should redirect to dashboard on success', async () => {
    const { wrapper, router } = await mountPage(RegisterPage, { route: '/register' })
    const auth = useAuthStore()
    const configStore = useConfigStore()
    configStore.config = { enableRegistration: true }
    auth.signUp = vi.fn().mockResolvedValue(true)
    const pushSpy = vi.spyOn(router, 'push')
    await flushPromises()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(pushSpy).toHaveBeenCalledWith({ name: 'dashboard' })
  })

  it('should show sign-in link', async () => {
    const { wrapper } = await mountPage(RegisterPage, { route: '/register' })
    const configStore = useConfigStore()
    configStore.config = { enableRegistration: true }
    await flushPromises()
    expect(wrapper.text()).toContain('Sign in')
  })
})
