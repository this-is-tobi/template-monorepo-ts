import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountPage } from '~/test/helpers'
import SettingsConfig from './SettingsConfig.vue'

const { mockConfigGet, mockConfigUpdate } = vi.hoisted(() => ({
  mockConfigGet: vi.fn().mockResolvedValue({ data: { data: { enableRegistration: true } } }),
  mockConfigUpdate: vi.fn().mockResolvedValue({ data: { data: { enableRegistration: false } } }),
}))

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
    mockConfigGet.mockResolvedValue({ data: { data: { enableRegistration: true } } })
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
    mockConfigUpdate.mockResolvedValue({ data: { data: { enableRegistration: false } } })
    const { wrapper, pinia } = await mountPage(SettingsConfig, { route: '/settings/config' })
    await flushPromises()
    const { useConfigStore } = await import('~/stores/config')
    const configStore = useConfigStore(pinia)
    const saveButton = wrapper.find('button')
    await saveButton.trigger('click')
    await flushPromises()
    expect(configStore.config.enableRegistration).toBe(false)
  })
})
