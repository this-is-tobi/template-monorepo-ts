import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountPage } from '~/test/helpers'
import SettingsGeneral from './SettingsGeneral.vue'

const { mockGetVersion, mockGetHealth, mockGetReady } = vi.hoisted(() => ({
  mockGetVersion: vi.fn().mockResolvedValue({ data: { version: '2.0.0' } }),
  mockGetHealth: vi.fn().mockResolvedValue({ data: { status: 'OK' } }),
  mockGetReady: vi.fn().mockResolvedValue({ data: { status: 'OK' } }),
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
  config: { appVersion: '1.0.0' },
}))

describe('settingsGeneral', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetVersion.mockResolvedValue({ data: { version: '2.0.0' } })
    mockGetHealth.mockResolvedValue({ data: { status: 'OK' } })
    mockGetReady.mockResolvedValue({ data: { status: 'OK' } })
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

  it('should show reachable DB status', async () => {
    const { wrapper } = await mountPage(SettingsGeneral, { route: '/settings/general' })
    await flushPromises()
    expect(wrapper.text()).toContain('Reachable')
  })

  it('should show degraded when health check fails', async () => {
    mockGetHealth.mockRejectedValue(new Error('timeout'))
    const { wrapper } = await mountPage(SettingsGeneral, { route: '/settings/general' })
    await flushPromises()
    expect(wrapper.text()).toContain('Degraded')
  })

  it('should show unreachable when ready check fails', async () => {
    mockGetReady.mockRejectedValue(new Error('timeout'))
    const { wrapper } = await mountPage(SettingsGeneral, { route: '/settings/general' })
    await flushPromises()
    expect(wrapper.text()).toContain('Unreachable')
  })

  it('should show unavailable when version fetch fails', async () => {
    mockGetVersion.mockRejectedValue(new Error('timeout'))
    const { wrapper } = await mountPage(SettingsGeneral, { route: '/settings/general' })
    await flushPromises()
    expect(wrapper.text()).toContain('unavailable')
  })
})
