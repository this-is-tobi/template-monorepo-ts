import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/config'
import { useThemeStore } from '~/stores/theme'
import { mockAdminUser, mockUser, mountPage } from '~/test/helpers'
import DefaultLayout from './DefaultLayout.vue'

vi.mock('~/lib/auth', () => ({
  authClient: {
    getSession: vi.fn().mockResolvedValue({ data: null }),
    signOut: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@primeuix/themes', () => ({
  updatePreset: vi.fn(),
}))

vi.mock('~/lib/api', () => ({
  apiClient: {
    theme: {
      get: vi.fn().mockResolvedValue({ data: { data: { primaryColor: 'zinc', surfaceColor: 'zinc' } } }),
    },
    config: {
      get: vi.fn().mockResolvedValue({ data: { data: { enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false } } }),
    },
  },
}))

describe('defaultLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('admin navigation', () => {
    it('shows settings link for admin users', async () => {
      const { wrapper } = await mountPage(DefaultLayout)
      const auth = useAuthStore()
      auth.user = { ...mockAdminUser }
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Settings')
    })

    it('hides settings link for non-admin users', async () => {
      const { wrapper } = await mountPage(DefaultLayout)
      const auth = useAuthStore()
      auth.user = { ...mockUser }
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).not.toContain('Settings')
    })

    it('shows organizations link in sidebar', async () => {
      const { wrapper } = await mountPage(DefaultLayout)
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Organizations')
    })

    it('shows settings sub-navigation when on a settings route', async () => {
      const { wrapper } = await mountPage(DefaultLayout, { route: '/settings/general' })
      const auth = useAuthStore()
      auth.user = { ...mockAdminUser }
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('General')
      expect(wrapper.text()).toContain('Configuration')
      expect(wrapper.text()).toContain('Theme')
    })

    it('hides settings sub-navigation when not on settings route', async () => {
      const { wrapper } = await mountPage(DefaultLayout, { route: '/' })
      const auth = useAuthStore()
      auth.user = { ...mockAdminUser }
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).not.toContain('General')
    })
  })

  describe('logo display', () => {
    it('shows logo image when logoUrl is set', async () => {
      const { wrapper } = await mountPage(DefaultLayout)
      const themeStore = useThemeStore()
      themeStore.theme.logoUrl = 'https://example.com/logo.png'
      await wrapper.vm.$nextTick()
      const img = wrapper.find('img')
      expect(img.exists()).toBe(true)
      expect(img.attributes('src')).toBe('https://example.com/logo.png')
    })

    it('shows text logo when logoUrl is not set', async () => {
      const { wrapper } = await mountPage(DefaultLayout)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.text()).toContain('Template Monorepo TS')
    })

    it('shows custom app name from config store', async () => {
      const { wrapper } = await mountPage(DefaultLayout)
      const configStore = useConfigStore()
      configStore.config.appName = 'Custom App'
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Custom App')
    })
  })

  describe('sidebar', () => {
    it('collapses sidebar when toggle button is clicked', async () => {
      const { wrapper } = await mountPage(DefaultLayout)
      const main = wrapper.find('main')
      expect(main.classes()).toContain('lg:pl-60')
      await wrapper.find('button[aria-label="Toggle sidebar"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(main.classes()).toContain('lg:pl-0')
      expect(main.classes()).not.toContain('lg:pl-60')
    })

    it('restores sidebar when toggle button is clicked again', async () => {
      const { wrapper } = await mountPage(DefaultLayout)
      await wrapper.find('button[aria-label="Toggle sidebar"]').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.find('button[aria-label="Toggle sidebar"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('main').classes()).toContain('lg:pl-60')
    })
  })

  describe('mobile sidebar', () => {
    it('opens mobile sidebar when mobile menu button is clicked', async () => {
      const { wrapper } = await mountPage(DefaultLayout)
      const sidebar = wrapper.find('aside')
      expect(sidebar.classes()).toContain('-translate-x-full')
      await wrapper.find('button[aria-label="Open menu"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(sidebar.classes()).not.toContain('-translate-x-full')
      expect(sidebar.classes()).toContain('translate-x-0')
    })

    it('closes mobile sidebar when close button is clicked', async () => {
      const { wrapper } = await mountPage(DefaultLayout)
      await wrapper.find('button[aria-label="Open menu"]').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.find('button[aria-label="Close menu"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('aside').classes()).toContain('-translate-x-full')
    })
  })

  describe('documentation link', () => {
    it('shows documentation link when documentationUrl is set', async () => {
      const { wrapper } = await mountPage(DefaultLayout)
      const configStore = useConfigStore()
      configStore.config.documentationUrl = 'https://docs.example.com'
      await wrapper.vm.$nextTick()
      const link = wrapper.find('a[href="https://docs.example.com"]')
      expect(link.exists()).toBe(true)
      expect(link.text()).toContain('Documentation')
    })

    it('hides documentation link when documentationUrl is empty', async () => {
      const { wrapper } = await mountPage(DefaultLayout)
      const configStore = useConfigStore()
      configStore.config.documentationUrl = ''
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).not.toContain('Documentation')
    })
  })

  describe('maintenance banner', () => {
    it('shows maintenance banner when maintenanceMode is active and user is admin', async () => {
      const { wrapper } = await mountPage(DefaultLayout)
      const auth = useAuthStore()
      auth.user = { ...mockAdminUser }
      const configStore = useConfigStore()
      configStore.config.maintenanceMode = true
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Maintenance mode is active')
    })

    it('hides maintenance banner when maintenanceMode is off', async () => {
      const { wrapper } = await mountPage(DefaultLayout)
      const configStore = useConfigStore()
      configStore.config.maintenanceMode = false
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).not.toContain('Maintenance mode is active')
    })
  })

  describe('sign out', () => {
    it('calls signOut and navigates to login route', async () => {
      const { wrapper, router } = await mountPage(DefaultLayout)
      const auth = useAuthStore()
      auth.user = { ...mockUser }
      await wrapper.vm.$nextTick()
      const buttons = wrapper.findAll('button')
      const signOutBtn = buttons.find(b => b.text().includes('Sign out'))
      expect(signOutBtn).toBeDefined()
      await signOutBtn!.trigger('click')
      await flushPromises()
      expect(auth.user).toBeNull()
      expect(router.currentRoute.value.name).toBe('login')
    })
  })

  describe('theme toggle', () => {
    it('calls toggleDarkMode when theme button is clicked', async () => {
      const { wrapper } = await mountPage(DefaultLayout)
      const themeStore = useThemeStore()
      themeStore.isDark = false
      themeStore.toggleDarkMode = vi.fn()
      await wrapper.vm.$nextTick()
      await wrapper.find('button[aria-label="Switch to dark mode"]').trigger('click')
      expect(themeStore.toggleDarkMode).toHaveBeenCalled()
    })
  })
})
