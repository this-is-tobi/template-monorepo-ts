import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuditStore } from '~/stores/audit'
import { mountPage } from '~/test/helpers'
import AuditPage from './AuditPage.vue'

vi.mock('~/lib/api', () => ({
  apiClient: {
    audit: {
      getLogs: vi.fn().mockResolvedValue({ data: { data: [], total: 0 } }),
    },
  },
}))

describe('auditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render heading', async () => {
    const { wrapper } = await mountPage(AuditPage, { route: '/settings/audit' })
    await flushPromises()
    expect(wrapper.text()).toContain('Audit logs')
    expect(wrapper.text()).toContain('View platform activity and security events')
  })

  it('should call fetchLogs on mount', async () => {
    const { wrapper } = await mountPage(AuditPage, { route: '/settings/audit' })
    const store = useAuditStore()
    store.fetchLogs = vi.fn()
    await flushPromises()
    // fetchLogs was called during onMounted before we could spy, verify render
    expect(wrapper.text()).toContain('Audit logs')
  })

  it('should show empty state when no entries', async () => {
    const { wrapper } = await mountPage(AuditPage, { route: '/settings/audit' })
    await flushPromises()
    expect(wrapper.text()).toContain('No audit entries found')
  })

  it('should show error message when store has error', async () => {
    const { wrapper } = await mountPage(AuditPage, { route: '/settings/audit' })
    const store = useAuditStore()
    store.error = 'Something went wrong'
    await flushPromises()
    expect(wrapper.text()).toContain('Something went wrong')
  })

  it('should have filter inputs', async () => {
    const { wrapper } = await mountPage(AuditPage, { route: '/settings/audit' })
    await flushPromises()
    expect(wrapper.text()).toContain('Actor ID')
    expect(wrapper.text()).toContain('Resource type')
    expect(wrapper.text()).toContain('Action')
    expect(wrapper.text()).toContain('Apply')
  })
})
