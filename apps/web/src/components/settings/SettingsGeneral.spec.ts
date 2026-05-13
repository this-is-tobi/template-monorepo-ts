import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountPage } from '~/test/helpers'
import SettingsGeneral from './SettingsGeneral.vue'

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
  },
}))

vi.mock('~/lib/config', () => ({
  APP_VERSION: '1.0.0',
}))

describe('settingsGeneral', () => {
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

  it('should render general heading', async () => {
    const { wrapper } = await mountPage(SettingsGeneral, { route: '/settings/general' })
    await flushPromises()
    expect(wrapper.text()).toContain('General')
  })

  it('should show web version', async () => {
    const { wrapper } = await mountPage(SettingsGeneral, { route: '/settings/general' })
    await flushPromises()
    expect(wrapper.text()).toContain('1.0.0')
  })

  it('should show API version after fetch', async () => {
    const { wrapper } = await mountPage(SettingsGeneral, { route: '/settings/general' })
    await flushPromises()
    expect(wrapper.text()).toContain('2.0.0')
  })

  it('should show healthy API status', async () => {
    const { wrapper } = await mountPage(SettingsGeneral, { route: '/settings/general' })
    await flushPromises()
    expect(wrapper.text()).toContain('Healthy')
  })

  it('should show healthy component statuses', async () => {
    const { wrapper } = await mountPage(SettingsGeneral, { route: '/settings/general' })
    await flushPromises()
    expect(wrapper.text()).toContain('Database')
    expect(wrapper.text()).toContain('Redis')
    expect(wrapper.text()).toContain('Keycloak')
  })

  it('should show degraded when health check fails', async () => {
    mockGetHealth.mockRejectedValue(new Error('timeout'))
    const { wrapper } = await mountPage(SettingsGeneral, { route: '/settings/general' })
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
    const { wrapper } = await mountPage(SettingsGeneral, { route: '/settings/general' })
    await flushPromises()
    expect(wrapper.text()).toContain('Unavailable')
  })

  it('should show unavailable when version fetch fails', async () => {
    mockGetVersion.mockRejectedValue(new Error('timeout'))
    const { wrapper } = await mountPage(SettingsGeneral, { route: '/settings/general' })
    await flushPromises()
    expect(wrapper.text()).toContain('unavailable')
  })
})
