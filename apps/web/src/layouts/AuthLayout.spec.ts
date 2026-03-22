import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useThemeStore } from '~/stores/theme'
import { mountPage } from '~/test/helpers'
import AuthLayout from './AuthLayout.vue'

vi.mock('@primeuix/themes', () => ({
  updatePreset: vi.fn(),
}))

describe('authLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders moon icon (switch-to-dark button) in light mode', async () => {
    const { wrapper } = await mountPage(AuthLayout)
    const themeStore = useThemeStore()
    themeStore.isDark = false
    await wrapper.vm.$nextTick()
    expect(wrapper.find('button[aria-label="Switch to dark mode"]').exists()).toBe(true)
  })

  it('renders sun icon (switch-to-light button) in dark mode', async () => {
    const { wrapper } = await mountPage(AuthLayout)
    const themeStore = useThemeStore()
    themeStore.isDark = true
    await wrapper.vm.$nextTick()
    expect(wrapper.find('button[aria-label="Switch to light mode"]').exists()).toBe(true)
  })

  it('calls toggleDarkMode when theme button is clicked', async () => {
    const { wrapper } = await mountPage(AuthLayout)
    const themeStore = useThemeStore()
    themeStore.isDark = false
    themeStore.toggleDarkMode = vi.fn()
    await wrapper.vm.$nextTick()
    await wrapper.find('button[aria-label="Switch to dark mode"]').trigger('click')
    expect(themeStore.toggleDarkMode).toHaveBeenCalled()
  })
})
