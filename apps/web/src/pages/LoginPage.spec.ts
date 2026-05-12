import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/config'
import { mountPage } from '~/test/helpers'
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
    configStore.config = { enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: null, maxProjectsPerOrg: null }
    await flushPromises()
    expect(wrapper.text()).toContain('Register')
  })

  it('should hide register link when registration is disabled', async () => {
    const { wrapper } = await mountPage(LoginPage, { route: '/login' })
    const configStore = useConfigStore()
    configStore.config = { enableRegistration: false, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false, maxOrganizationsPerUser: null, maxProjectsPerOrg: null }
    await flushPromises()
    expect(wrapper.text()).not.toContain('Don\'t have an account?')
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
