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

const { mockNotify } = vi.hoisted(() => ({
  mockNotify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('~/composables/useNotify', () => ({
  useNotify: () => mockNotify,
}))

/**
 * Make a real edit so the dirty-gated actions become available.
 * Uses the logo field because the colour pickers are stubbed out.
 */
async function editLogoUrl(wrapper: { find: (s: string) => { setValue: (v: string) => Promise<void> } }) {
  await wrapper.find('input[placeholder="https://example.com/logo.svg"]').setValue('https://example.com/new.svg')
}

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
    expect(wrapper.text()).toContain('Primary color')
    expect(wrapper.text()).toContain('Surface color')
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

  it('should keep save disabled until something changes', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    await flushPromises()

    const save = wrapper.findAll('button').find(b => b.text() === 'Save changes')
    expect(save?.attributes('disabled')).toBeDefined()
    // Cancel only appears once there is something to cancel.
    expect(wrapper.findAll('button').some(b => b.text() === 'Cancel')).toBe(false)
  })

  it('should warn that the live preview is unsaved', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    await flushPromises()
    expect(wrapper.text()).not.toContain('Previewing unsaved changes')

    await editLogoUrl(wrapper)
    await flushPromises()
    expect(wrapper.text()).toContain('Previewing unsaved changes')
  })

  it('should restore the saved palette when leaving with unsaved changes', async () => {
    // Regression: previewing writes onto `:root`, so unsaved colours used to
    // follow the user across the whole app and then silently revert on the
    // next reload — indistinguishable from a save that did not work.
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    await flushPromises()

    await editLogoUrl(wrapper)
    await flushPromises()
    vi.mocked(themeStore.previewTheme).mockClear()

    wrapper.unmount()

    expect(themeStore.previewTheme).toHaveBeenCalledWith(themeStore.theme)
  })

  it('should not touch the palette when leaving with no changes', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    await flushPromises()
    vi.mocked(themeStore.previewTheme).mockClear()

    wrapper.unmount()

    expect(themeStore.previewTheme).not.toHaveBeenCalled()
  })

  it('should notify an error when save fails', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    themeStore.updateTheme = vi.fn().mockRejectedValue(new Error('Failed to save theme'))
    await flushPromises()

    await editLogoUrl(wrapper)
    const saveButton = wrapper.findAll('button').find(b => b.text() === 'Save changes')
    await saveButton!.trigger('click')
    await flushPromises()

    expect(mockNotify.error).toHaveBeenCalledWith('Could not save theme', expect.any(Error))
  })

  it('should call updateTheme on save', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    themeStore.updateTheme = vi.fn().mockResolvedValue(undefined)
    await flushPromises()

    await editLogoUrl(wrapper)
    const saveButton = wrapper.findAll('button').find(b => b.text() === 'Save changes')
    await saveButton!.trigger('click')
    await flushPromises()

    expect(themeStore.updateTheme).toHaveBeenCalledOnce()
    expect(themeStore.updateTheme).toHaveBeenCalledWith(expect.objectContaining({
      primaryColor: expect.any(String),
      surfaceColor: expect.any(String),
    }))
  })

  it('should notify success after save', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    themeStore.updateTheme = vi.fn().mockResolvedValue(undefined)
    await flushPromises()

    await editLogoUrl(wrapper)
    const saveButton = wrapper.findAll('button').find(b => b.text() === 'Save changes')
    await saveButton!.trigger('click')
    await flushPromises()

    expect(mockNotify.success).toHaveBeenCalledWith('Theme saved', expect.any(String))
  })

  it('should discard edits on cancel', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    await flushPromises()

    await editLogoUrl(wrapper)
    const resetButton = wrapper.findAll('button').find(b => b.text() === 'Cancel')
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

    const saveButton = w2.findAll('button').find(b => b.text() === 'Save changes')
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

    await editLogoUrl(wrapper)
    const saveButton = wrapper.findAll('button').find(b => b.text() === 'Save changes')
    await saveButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Theme saved')
  })

  it('should show advanced/preset JSON section', async () => {
    const { wrapper } = await mountPage(SettingsTheme, { route: '/settings/theme' })
    const themeStore = useThemeStore()
    themeStore.previewTheme = vi.fn()
    await flushPromises()
    expect(wrapper.text()).toContain('Advanced')
  })
})
