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

  it('should call updateTheme on save', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    themeStore.updateTheme = vi.fn().mockResolvedValue(undefined)
    await flushPromises()

    const saveButton = wrapper.findAll('button').find(b => b.text() === 'Save')
    await saveButton!.trigger('click')
    await flushPromises()

    expect(themeStore.updateTheme).toHaveBeenCalledOnce()
    expect(themeStore.updateTheme).toHaveBeenCalledWith(expect.objectContaining({
      primaryColor: expect.any(String),
      surfaceColor: expect.any(String),
    }))
  })

  it('should show success message after save', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    themeStore.updateTheme = vi.fn().mockResolvedValue(undefined)
    await flushPromises()

    const saveButton = wrapper.findAll('button').find(b => b.text() === 'Save')
    await saveButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Theme saved')
  })

  it('should reset form on reset button click', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    await flushPromises()

    const resetButton = wrapper.findAll('button').find(b => b.text() === 'Reset')
    await resetButton!.trigger('click')
    await flushPromises()

    expect(themeStore.previewTheme).toHaveBeenCalled()
  })

  it('should include logoUrl in payload when set', async () => {
    const { wrapper: w2 } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const ts2 = useThemeStore()
    ts2.previewTheme = vi.fn()
    ts2.updateTheme = vi.fn().mockResolvedValue(undefined)
    ts2.theme = { primaryColor: 'blue', surfaceColor: 'zinc', logoUrl: 'https://example.com/logo.svg' }
    await flushPromises()

    const saveButton = w2.findAll('button').find(b => b.text() === 'Save')
    await saveButton!.trigger('click')
    await flushPromises()

    expect(ts2.updateTheme).toHaveBeenCalledOnce()
  })

  it('should not show success message when save fails', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    themeStore.updateTheme = vi.fn().mockRejectedValue(new Error('fail'))
    await flushPromises()

    const saveButton = wrapper.findAll('button').find(b => b.text() === 'Save')
    await saveButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Theme saved')
  })
})
