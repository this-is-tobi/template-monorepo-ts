import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountPage } from '~/test/helpers'
import DashboardActivity from './DashboardActivity.vue'

const { mockGetLogs } = vi.hoisted(() => ({ mockGetLogs: vi.fn() }))

vi.mock('~/lib/api', () => ({
  apiClient: { audit: { getLogs: (...a: unknown[]) => mockGetLogs(...a) } },
}))

function entry(over: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    actorId: 'u1',
    action: 'project:create',
    resourceType: 'project',
    resourceId: 'p1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

describe('dashboardActivity', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should request only the latest few entries', async () => {
    mockGetLogs.mockResolvedValueOnce({ data: { data: [], total: 0 } })
    await mountPage(DashboardActivity)
    await flushPromises()

    expect(mockGetLogs).toHaveBeenCalledWith(expect.objectContaining({ limit: 6, offset: 0 }))
  })

  it('should render recent entries with their resource type', async () => {
    mockGetLogs.mockResolvedValueOnce({ data: { data: [entry()], total: 1 } })
    const { wrapper } = await mountPage(DashboardActivity)
    await flushPromises()

    expect(wrapper.text()).toContain('Recent activity')
    expect(wrapper.text()).toContain('project')
    // The namespace is dropped so the verb reads first.
    expect(wrapper.text()).toContain('create')
  })

  it('should show an empty state when nothing has been recorded', async () => {
    mockGetLogs.mockResolvedValueOnce({ data: { data: [], total: 0 } })
    const { wrapper } = await mountPage(DashboardActivity)
    await flushPromises()

    expect(wrapper.text()).toContain('No recorded activity yet')
  })

  it('should hide itself when audit is unavailable rather than breaking the dashboard', async () => {
    // Audit is an optional module and reads require `audit:read`.
    mockGetLogs.mockRejectedValueOnce(new Error('403'))
    const { wrapper } = await mountPage(DashboardActivity)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Recent activity')
  })
})
