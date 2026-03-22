import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useThemeStore } from '~/stores/theme'
import { mountPage } from '~/test/helpers'
import SettingsTheme from './SettingsTheme.vue'

vi.mock('@template-monorepo-ts/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@template-monorepo-ts/shared')>()
  return {
    ...actual,
    ThemeColorNames: ['emerald', 'blue', 'red'],
  }
})

vi.mock('~/lib/api', () => ({
  apiClient: {
    theme: {
      get: vi.fn().mockResolvedValue({ data: { data: { primaryColor: 'zinc', surfaceColor: 'zinc' } } }),
      update: vi.fn(),
    },
  },
}))

vi.mock('@primeuix/themes', () => ({
  updatePreset: vi.fn(),
}))

describe('settingsTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render theme heading', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    await flushPromises()
    expect(wrapper.text()).toContain('Theme')
  })

  it('should show color section', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    await flushPromises()
    expect(wrapper.text()).toContain('Primary Color')
    expect(wrapper.text()).toContain('Surface Color')
  })

  it('should show branding section', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    await flushPromises()
    expect(wrapper.text()).toContain('Branding')
    expect(wrapper.text()).toContain('Logo URL')
  })

  it('should show advanced section', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    await flushPromises()
    expect(wrapper.text()).toContain('Advanced')
  })

  it('should show save and reset buttons', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    await flushPromises()
    expect(wrapper.text()).toContain('Save')
    expect(wrapper.text()).toContain('Reset')
  })

  it('should display theme error from store', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    themeStore.error = 'Failed to save theme'
    await flushPromises()
    expect(wrapper.text()).toContain('Failed to save theme')
  })
})
