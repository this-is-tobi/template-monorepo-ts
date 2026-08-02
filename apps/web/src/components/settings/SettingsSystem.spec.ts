import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountPage } from '~/test/helpers'
import SettingsSystem from './SettingsSystem.vue'

const { mockGetVersion, mockGetHealth, mockGetReady } = vi.hoisted(() => ({
  mockGetVersion: vi.fn().mockResolvedValue({ data: { version: '2.0.0' } }),
  mockGetHealth: vi.fn().mockResolvedValue({ data: { status: 'OK' } }),
  mockGetReady: vi.fn().mockResolvedValue({
    data: {
      status: 'OK',
      components: {
        database: { status: 'ok' },
        redis: { status: 'ok' },
        keycloak: { status: 'ok', message: 'Not enabled' },
      },
    },
  }),
}))

vi.mock('~/lib/api', () => ({
  apiClient: {
    system: {
      getVersion: mockGetVersion,
      getHealth: mockGetHealth,
      getReady: mockGetReady,
    },
    config: {
      getRuntime: vi.fn().mockResolvedValue({ data: { entries: [] } }),
    },
  },
}))

vi.mock('~/lib/config', () => ({
  APP_VERSION: '1.0.0',
}))

describe('settingsSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetVersion.mockResolvedValue({ data: { version: '2.0.0' } })
    mockGetHealth.mockResolvedValue({ data: { status: 'OK' } })
    mockGetReady.mockResolvedValue({
      data: {
        status: 'OK',
        components: {
          database: { status: 'ok' },
          redis: { status: 'ok' },
          keycloak: { status: 'ok', message: 'Not enabled' },
        },
      },
    })
  })

  it('should render system heading', async () => {
    const { wrapper } = await mountPage(SettingsSystem, { route: '/settings/system' })
    await flushPromises()
    expect(wrapper.text()).toContain('System')
  })

  it('should re-probe service status on refresh', async () => {
    const { wrapper } = await mountPage(SettingsSystem, { route: '/settings/system' })
    await flushPromises()
    expect(mockGetReady).toHaveBeenCalledTimes(1)

    // A point-in-time probe is useless while watching a dependency recover
    // unless it can be re-run without reloading the app.
    await wrapper.findAll('button').find(b => b.text().includes('Refresh'))?.trigger('click')
    await flushPromises()

    expect(mockGetReady).toHaveBeenCalledTimes(2)
  })

  it('should show web version', async () => {
    const { wrapper } = await mountPage(SettingsSystem, { route: '/settings/system' })
    await flushPromises()
    expect(wrapper.text()).toContain('1.0.0')
  })

  it('should show API version after fetch', async () => {
    const { wrapper } = await mountPage(SettingsSystem, { route: '/settings/system' })
    await flushPromises()
    expect(wrapper.text()).toContain('2.0.0')
  })

  it('should show healthy API status', async () => {
    const { wrapper } = await mountPage(SettingsSystem, { route: '/settings/system' })
    await flushPromises()
    expect(wrapper.text()).toContain('Healthy')
  })

  it('should show healthy component statuses', async () => {
    const { wrapper } = await mountPage(SettingsSystem, { route: '/settings/system' })
    await flushPromises()
    expect(wrapper.text()).toContain('Database')
    expect(wrapper.text()).toContain('Redis')
    expect(wrapper.text()).toContain('Keycloak')
  })

  it('should show degraded when health check fails', async () => {
    mockGetHealth.mockRejectedValue(new Error('timeout'))
    const { wrapper } = await mountPage(SettingsSystem, { route: '/settings/system' })
    await flushPromises()
    expect(wrapper.text()).toContain('Degraded')
  })

  it('should show unavailable when a component is down', async () => {
    mockGetReady.mockResolvedValue({
      data: {
        status: 'KO',
        components: {
          database: { status: 'unavailable', message: 'Database is not reachable' },
          redis: { status: 'ok' },
          keycloak: { status: 'ok', message: 'Not enabled' },
        },
      },
    })
    const { wrapper } = await mountPage(SettingsSystem, { route: '/settings/system' })
    await flushPromises()
    expect(wrapper.text()).toContain('Unavailable')
  })

  it('should show unavailable when version fetch fails', async () => {
    mockGetVersion.mockRejectedValue(new Error('timeout'))
    const { wrapper } = await mountPage(SettingsSystem, { route: '/settings/system' })
    await flushPromises()
    expect(wrapper.text()).toContain('unavailable')
  })
})
