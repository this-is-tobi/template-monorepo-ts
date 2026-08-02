import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/config'
import { mockAppConfig, mountPage } from '~/test/helpers'
import LoginPage from './LoginPage.vue'

describe('loginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render sign-in form', async () => {
    const { wrapper } = await mountPage(LoginPage, { route: '/login' })
    expect(wrapper.text()).toContain('Sign in')
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('should display error message when auth.error is set', async () => {
    const { wrapper } = await mountPage(LoginPage, { route: '/login' })
    const auth = useAuthStore()
    auth.error = 'Invalid credentials'
    await flushPromises()
    expect(wrapper.text()).toContain('Invalid credentials')
  })

  it('should call signIn on form submit', async () => {
    const { wrapper } = await mountPage(LoginPage, { route: '/login' })
    const auth = useAuthStore()
    auth.signIn = vi.fn().mockResolvedValue(true)

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(auth.signIn).toHaveBeenCalledWith('', '')
  })

  it('should show loading state during sign-in', async () => {
    const { wrapper } = await mountPage(LoginPage, { route: '/login' })
    const auth = useAuthStore()
    auth.loading = true
    await flushPromises()
    expect(wrapper.text()).toContain('Signing in...')
  })

  it('should show SSO buttons when providers are available', async () => {
    const { wrapper } = await mountPage(LoginPage, { route: '/login' })
    const configStore = useConfigStore()
    configStore.ssoProviders = ['keycloak']
    await flushPromises()
    expect(wrapper.text()).toContain('Sign in with Keycloak')
  })

  it('should hide SSO section when no providers', async () => {
    const { wrapper } = await mountPage(LoginPage, { route: '/login' })
    const configStore = useConfigStore()
    configStore.ssoProviders = []
    await flushPromises()
    expect(wrapper.text()).not.toContain('Sign in with')
  })

  it('should show register link when registration is enabled', async () => {
    const { wrapper } = await mountPage(LoginPage, { route: '/login' })
    const configStore = useConfigStore()
    configStore.config = mockAppConfig({ enableRegistration: true, allowOrganizationCreation: true, maintenanceMode: false })
    await flushPromises()
    expect(wrapper.text()).toContain('Register')
  })

  it('should hide register link when registration is disabled', async () => {
    const { wrapper } = await mountPage(LoginPage, { route: '/login' })
    const configStore = useConfigStore()
    configStore.config = mockAppConfig({ enableRegistration: false, allowOrganizationCreation: true, maintenanceMode: false })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Don\'t have an account?')
  })

  describe('sSO-only instance', () => {
    it('should drop the credentials form entirely', async () => {
      // The server rejects `sign-in/email` when local accounts are off, so a
      // password form here would be a dead end.
      const { wrapper } = await mountPage(LoginPage, { route: '/login' })
      const configStore = useConfigStore()
      configStore.emailPasswordEnabled = false
      configStore.ssoProviders = ['keycloak']
      await flushPromises()

      expect(wrapper.find('#email').exists()).toBe(false)
      expect(wrapper.find('#password').exists()).toBe(false)
      expect(wrapper.findAll('button').some(b => b.text().includes('Sign in with Keycloak'))).toBe(true)
    })

    it('should drop the "or" divider that has nothing above it', async () => {
      const { wrapper } = await mountPage(LoginPage, { route: '/login' })
      const configStore = useConfigStore()
      configStore.ssoProviders = ['keycloak']

      configStore.emailPasswordEnabled = true
      await flushPromises()
      expect(wrapper.findAll('span').some(s => s.text() === 'or')).toBe(true)

      configStore.emailPasswordEnabled = false
      await flushPromises()
      expect(wrapper.findAll('span').some(s => s.text() === 'or')).toBe(false)
    })

    it('should hide the register link even when registration is enabled', async () => {
      // Registration creates a local account; without one there is nothing to
      // register, whatever the platform setting says.
      const { wrapper } = await mountPage(LoginPage, { route: '/login' })
      const configStore = useConfigStore()
      configStore.config = mockAppConfig({ enableRegistration: true })
      configStore.emailPasswordEnabled = false
      await flushPromises()

      expect(wrapper.text()).not.toContain('Don\'t have an account?')
    })

    it('should keep the credentials form when the config fetch failed', async () => {
      // The store default is optimistic on purpose: hiding the form on a
      // transient API blip would turn it into a locked door.
      const { wrapper } = await mountPage(LoginPage, { route: '/login' })

      expect(useConfigStore().emailPasswordEnabled).toBe(true)
      expect(wrapper.find('#password').exists()).toBe(true)
    })
  })

  it('should redirect to dashboard on successful sign-in', async () => {
    const { wrapper, router } = await mountPage(LoginPage, { route: '/login' })
    const auth = useAuthStore()
    auth.signIn = vi.fn().mockResolvedValue(true)
    const pushSpy = vi.spyOn(router, 'push')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(pushSpy).toHaveBeenCalledWith({ name: 'dashboard' })
  })

  it('should not redirect on failed sign-in', async () => {
    const { wrapper, router } = await mountPage(LoginPage, { route: '/login' })
    const auth = useAuthStore()
    auth.signIn = vi.fn().mockResolvedValue(false)
    const pushSpy = vi.spyOn(router, 'push')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(pushSpy).not.toHaveBeenCalled()
  })

  it('should call ssoSignIn when SSO button is clicked', async () => {
    const { wrapper } = await mountPage(LoginPage, { route: '/login' })
    const auth = useAuthStore()
    auth.ssoSignIn = vi.fn()
    const configStore = useConfigStore()
    configStore.ssoProviders = ['keycloak']
    await flushPromises()

    const ssoButton = wrapper.findAll('button').find(b => b.text().includes('Keycloak'))
      ?? wrapper.findAllComponents({ name: 'Button' }).find(b => b.text().includes('Keycloak'))
    if (ssoButton) {
      await ssoButton.trigger('click')
      await flushPromises()
      expect(auth.ssoSignIn).toHaveBeenCalledWith('keycloak')
    }
  })
})
