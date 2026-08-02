import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockAppConfig, mountPage } from '~/test/helpers'
import SettingsGeneral from './SettingsGeneral.vue'

const { mockConfigGet, mockConfigUpdate } = vi.hoisted(() => ({
  mockConfigGet: vi.fn(),
  mockConfigUpdate: vi.fn(),
}))

const { mockNotify } = vi.hoisted(() => ({
  mockNotify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const { mockConfirmRequire } = vi.hoisted(() => ({ mockConfirmRequire: vi.fn() }))

vi.mock('~/composables/useNotify', () => ({ useNotify: () => mockNotify }))
vi.mock('~/composables/useConfirm', () => ({ useConfirm: () => ({ require: mockConfirmRequire }) }))
vi.mock('~/lib/api', () => ({
  apiClient: { config: { get: mockConfigGet, update: mockConfigUpdate } },
}))

const savedConfig = mockAppConfig()

/**
 * Mount with the config endpoint answering `config`, and wait for the fetch.
 *
 * `SettingsField` renders for real — it owns the label, the lock badge and the
 * control's `id`, so stubbing it would leave nothing meaningful to assert.
 */
async function mountSettings(config = savedConfig, lockedFields: string[] = []) {
  mockConfigGet.mockResolvedValue({ data: { data: config, ssoProviders: [], lockedFields } })
  const mounted = await mountPage(SettingsGeneral, {
    route: '/settings/general',
    global: { stubs: { SettingsField: false } },
  })
  await flushPromises()
  return mounted
}

type Wrapper = Awaited<ReturnType<typeof mountPage>>['wrapper']

function findButton(wrapper: Wrapper, label: string) {
  return wrapper.findAll('button').find(b => b.text().includes(label))
}

describe('settingsGeneral', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfigUpdate.mockResolvedValue({ data: { data: savedConfig } })
  })

  describe('loading', () => {
    it('should fetch the configuration on mount', async () => {
      await mountSettings()
      expect(mockConfigGet).toHaveBeenCalled()
    })

    it('should render every settings group', async () => {
      const { wrapper } = await mountSettings()
      const text = wrapper.text()

      expect(text).toContain('Application name')
      expect(text).toContain('Documentation URL')
      expect(text).toContain('Enable registration')
      expect(text).toContain('Allow organization creation')
      expect(text).toContain('Max organizations per user')
      expect(text).toContain('Max projects per organization')
      expect(text).toContain('Audit log retention')
      expect(text).toContain('Maintenance mode')
    })

    it('should not render the form when the config could not be loaded', async () => {
      // Regression: the form used to render with schema defaults behind a
      // small error line, so one Save click overwrote live platform config
      // with template values after a transient network error.
      mockConfigGet.mockRejectedValue(new Error('Network error'))
      const { wrapper } = await mountPage(SettingsGeneral, {
        route: '/settings/general',
        global: { stubs: { SettingsField: false } },
      })
      await flushPromises()

      expect(wrapper.text()).toContain('Failed to load configuration')
      expect(wrapper.text()).not.toContain('Application name')
      expect(findButton(wrapper, 'Save changes')).toBeUndefined()
    })

    it('should offer a retry after a failed load', async () => {
      mockConfigGet.mockRejectedValueOnce(new Error('Network error'))
      const { wrapper } = await mountPage(SettingsGeneral, {
        route: '/settings/general',
        global: { stubs: { SettingsField: false } },
      })
      await flushPromises()

      mockConfigGet.mockResolvedValueOnce({ data: { data: savedConfig, ssoProviders: [], lockedFields: [] } })
      await findButton(wrapper, 'Try again')?.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Application name')
    })
  })

  describe('dirty state', () => {
    it('should keep save disabled until something changes', async () => {
      const { wrapper } = await mountSettings()
      expect(findButton(wrapper, 'Save changes')?.attributes('disabled')).toBeDefined()
      expect(wrapper.text()).not.toContain('Unsaved changes')
    })

    it('should enable save and flag unsaved changes once edited', async () => {
      const { wrapper } = await mountSettings()

      await wrapper.find('#appName').setValue('Renamed')
      await flushPromises()

      expect(findButton(wrapper, 'Save changes')?.attributes('disabled')).toBeUndefined()
      expect(wrapper.text()).toContain('Unsaved changes')
    })

    it('should discard edits on cancel', async () => {
      const { wrapper } = await mountSettings()

      await wrapper.find('#appName').setValue('Renamed')
      await flushPromises()
      await findButton(wrapper, 'Cancel')?.trigger('click')
      await flushPromises()

      expect(wrapper.text()).not.toContain('Unsaved changes')
      expect(mockConfigUpdate).not.toHaveBeenCalled()
    })
  })

  describe('saving', () => {
    it('should send the edited configuration', async () => {
      const { wrapper } = await mountSettings()

      await wrapper.find('#appName').setValue('Renamed')
      await findButton(wrapper, 'Save changes')?.trigger('click')
      await flushPromises()

      expect(mockConfigUpdate).toHaveBeenCalledWith(expect.objectContaining({ appName: 'Renamed' }))
      expect(mockNotify.success).toHaveBeenCalledWith('Configuration saved')
    })

    it('should surface a save failure without losing the edits', async () => {
      mockConfigUpdate.mockRejectedValue(new Error('Save failed'))
      const { wrapper } = await mountSettings()

      await wrapper.find('#appName').setValue('Renamed')
      await findButton(wrapper, 'Save changes')?.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Failed to save configuration')
      expect((wrapper.find('#appName').element as HTMLInputElement).value).toBe('Renamed')
    })
  })

  describe('maintenance mode', () => {
    it('should require confirmation before locking everyone out', async () => {
      const { wrapper } = await mountSettings()

      await wrapper.findComponent('#maintenanceMode').setValue(true)
      await flushPromises()
      expect(wrapper.text()).toContain('lock every non-admin user out')

      await findButton(wrapper, 'Save changes')?.trigger('click')
      await flushPromises()

      // Nothing is written until the dialog is accepted.
      expect(mockConfigUpdate).not.toHaveBeenCalled()
      expect(mockConfirmRequire).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Enable maintenance mode?' }),
      )

      mockConfirmRequire.mock.calls[0]![0].accept()
      await flushPromises()
      expect(mockConfigUpdate).toHaveBeenCalledWith(expect.objectContaining({ maintenanceMode: true }))
    })

    it('should not confirm when turning maintenance mode off', async () => {
      const { wrapper } = await mountSettings(mockAppConfig({ maintenanceMode: true }))

      await wrapper.findComponent('#maintenanceMode').setValue(false)
      await findButton(wrapper, 'Save changes')?.trigger('click')
      await flushPromises()

      expect(mockConfirmRequire).not.toHaveBeenCalled()
      expect(mockConfigUpdate).toHaveBeenCalledWith(expect.objectContaining({ maintenanceMode: false }))
    })
  })

  describe('env-locked fields', () => {
    it('should disable a pinned field and name the variable that pins it', async () => {
      const { wrapper } = await mountSettings(savedConfig, ['appName'])

      expect(wrapper.find('#appName').attributes('disabled')).toBeDefined()
      const badge = wrapper.findAll('span').find(s => s.text() === 'env')
      expect(badge?.attributes('title')).toContain('PLATFORM__APP_NAME')
    })

    it('should leave unlocked fields editable', async () => {
      const { wrapper } = await mountSettings(savedConfig, ['appName'])
      expect(wrapper.find('#documentationUrl').attributes('disabled')).toBeUndefined()
    })
  })
})
