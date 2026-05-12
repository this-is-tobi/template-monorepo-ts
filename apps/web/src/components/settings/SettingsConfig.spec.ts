import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountPage } from '~/test/helpers'
import SettingsConfig from './SettingsConfig.vue'

const { mockConfigGet, mockConfigUpdate, defaultConfig } = vi.hoisted(() => {
  const defaultConfig = {
    enableRegistration: true,
    allowOrganizationCreation: true,
    appName: 'Template Monorepo TS',
    documentationUrl: '',
    maintenanceMode: false,
  }
  return {
    defaultConfig,
    mockConfigGet: vi.fn().mockResolvedValue({ data: { data: defaultConfig } }),
    mockConfigUpdate: vi.fn().mockResolvedValue({ data: { data: { ...defaultConfig, enableRegistration: false } } }),
  }
})

vi.mock('~/lib/api', () => ({
  apiClient: {
    config: {
      get: mockConfigGet,
      update: mockConfigUpdate,
    },
  },
}))

describe('settingsConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfigGet.mockResolvedValue({ data: { data: defaultConfig } })
  })

  it('should render configuration heading', async () => {
    const { wrapper } = await mountPage(SettingsConfig, { route: '/settings/config' })
    await flushPromises()
    expect(wrapper.text()).toContain('Configuration')
  })

  it('should fetch config on mount', async () => {
    await mountPage(SettingsConfig, { route: '/settings/config' })
    await flushPromises()
    expect(mockConfigGet).toHaveBeenCalled()
  })

  it('should show registration toggle', async () => {
    const { wrapper } = await mountPage(SettingsConfig, { route: '/settings/config' })
    await flushPromises()
    expect(wrapper.text()).toContain('Enable registration')
  })

  it('should show save button', async () => {
    const { wrapper } = await mountPage(SettingsConfig, { route: '/settings/config' })
    await flushPromises()
    expect(wrapper.text()).toContain('Save')
  })

  it('should show error when config fetch fails', async () => {
    mockConfigGet.mockRejectedValue(new Error('Network error'))
    const { wrapper } = await mountPage(SettingsConfig, { route: '/settings/config' })
    await flushPromises()
    expect(wrapper.text()).toContain('Failed to load configuration')
  })

  it('should show success message after save', async () => {
    const { wrapper } = await mountPage(SettingsConfig, { route: '/settings/config' })
    await flushPromises()
    const saveButton = wrapper.find('button')
    await saveButton.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Configuration saved')
  })

  it('should show error message when save fails', async () => {
    mockConfigUpdate.mockRejectedValue(new Error('Save failed'))
    const { wrapper } = await mountPage(SettingsConfig, { route: '/settings/config' })
    await flushPromises()
    const saveButton = wrapper.find('button')
    await saveButton.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Failed to save configuration')
  })

  it('should update configStore after successful save', async () => {
    mockConfigUpdate.mockResolvedValue({ data: { data: { ...defaultConfig, enableRegistration: false } } })
    const { wrapper, pinia } = await mountPage(SettingsConfig, { route: '/settings/config' })
    await flushPromises()
    const { useConfigStore } = await import('~/stores/config')
    const configStore = useConfigStore(pinia)
    const saveButton = wrapper.find('button')
    await saveButton.trigger('click')
    await flushPromises()
    expect(configStore.config.enableRegistration).toBe(false)
  })

  it('should show app name input', async () => {
    const { wrapper } = await mountPage(SettingsConfig, { route: '/settings/config' })
    await flushPromises()
    expect(wrapper.text()).toContain('Application name')
  })

  it('should show organization creation toggle', async () => {
    const { wrapper } = await mountPage(SettingsConfig, { route: '/settings/config' })
    await flushPromises()
    expect(wrapper.text()).toContain('Allow organization creation')
  })

  it('should show documentation URL input', async () => {
    const { wrapper } = await mountPage(SettingsConfig, { route: '/settings/config' })
    await flushPromises()
    expect(wrapper.text()).toContain('Documentation URL')
  })

  it('should show maintenance mode toggle', async () => {
    const { wrapper } = await mountPage(SettingsConfig, { route: '/settings/config' })
    await flushPromises()
    expect(wrapper.text()).toContain('Maintenance mode')
  })

  it('should show quota fields', async () => {
    const { wrapper } = await mountPage(SettingsConfig, { route: '/settings/config' })
    await flushPromises()
    expect(wrapper.text()).toContain('Max organizations per user')
    expect(wrapper.text()).toContain('Max projects per organization')
  })

  it('should call update with the current form values on save', async () => {
    const { wrapper } = await mountPage(SettingsConfig, { route: '/settings/config' })
    await flushPromises()
    const saveButton = wrapper.find('button')
    await saveButton.trigger('click')
    await flushPromises()
    expect(mockConfigUpdate).toHaveBeenCalledWith(expect.objectContaining({
      appName: defaultConfig.appName,
      enableRegistration: defaultConfig.enableRegistration,
    }))
  })
})
