import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useApiKeysStore } from '~/stores/api-keys'
import { useConfigStore } from '~/stores/config'
import { useOrganizationsStore } from '~/stores/organizations'
import { useProjectsStore } from '~/stores/projects'
import { mockApiKey, mockAppConfig, mountPage } from '~/test/helpers'
import DashboardStats from './DashboardStats.vue'

interface Seed {
  projectTotal?: number
  organizations?: number
  apiKeys?: ReturnType<typeof mockApiKey>[]
  config?: Parameters<typeof mockAppConfig>[0]
}

/** Mount, then seed each store the widget reads — it fetches on mount. */
async function mountStats(seed: Seed = {}) {
  const mounted = await mountPage(DashboardStats)

  useProjectsStore().total = seed.projectTotal ?? 0
  useOrganizationsStore().organizations = Array.from(
    { length: seed.organizations ?? 0 },
    (_, i) => ({ id: `org-${i}`, name: `Org ${i}`, slug: `org-${i}` }),
  ) as never
  useApiKeysStore().apiKeys = seed.apiKeys ?? []
  useConfigStore().config = mockAppConfig(seed.config)

  await flushPromises()
  return mounted
}

/** The quota bar's filled portion, or undefined when no bar is rendered. */
function quotaBar(wrapper: Awaited<ReturnType<typeof mountStats>>['wrapper'], label: string) {
  const card = wrapper.findAll('a').find(a => a.text().includes(label))
  return card?.find('[style*="width"]')
}

describe('dashboardStats', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('counters', () => {
    it('should render one counter per resource', async () => {
      const { wrapper } = await mountStats()
      const text = wrapper.text()

      expect(text).toContain('Projects')
      expect(text).toContain('Organizations')
      expect(text).toContain('API keys')
    })

    it('should show the project total from the store, not the page size', async () => {
      // The store fetches `limit: 5` for the recent list; the counter must
      // report the full total or it silently caps at five.
      const { wrapper } = await mountStats({ projectTotal: 42 })
      expect(wrapper.text()).toContain('42')
    })

    it('should count only enabled API keys, with the full count as the hint', async () => {
      const { wrapper } = await mountStats({
        apiKeys: [
          mockApiKey({ id: 'k1', enabled: true }),
          mockApiKey({ id: 'k2', enabled: true }),
          mockApiKey({ id: 'k3', enabled: false }),
        ],
      })

      expect(wrapper.text()).toContain('3 total')
      const card = wrapper.findAll('a').find(a => a.text().includes('API keys'))
      expect(card?.text()).toContain('2')
    })
  })

  describe('quotas', () => {
    it('should show no ceiling when the platform sets no quota', async () => {
      const { wrapper } = await mountStats({
        projectTotal: 3,
        config: { maxProjectsPerOrg: null, maxOrganizationsPerUser: null },
      })

      expect(wrapper.text()).not.toMatch(/\/\s*\d/)
      expect(quotaBar(wrapper, 'Projects')?.exists()).toBeFalsy()
    })

    it('should show the ceiling and a usage bar when a quota exists', async () => {
      const { wrapper } = await mountStats({ projectTotal: 3, config: { maxProjectsPerOrg: 10 } })

      expect(wrapper.text()).toContain('/ 10')
      expect(quotaBar(wrapper, 'Projects')?.attributes('style')).toContain('width: 30%')
    })

    it('should warn in the destructive colour once nearly exhausted', async () => {
      const { wrapper } = await mountStats({ projectTotal: 9, config: { maxProjectsPerOrg: 10 } })

      const bar = quotaBar(wrapper, 'Projects')
      expect(bar?.attributes('style')).toContain('width: 90%')
      expect(bar?.classes().join(' ')).toContain('destructive')
    })

    it('should stay in the normal colour below the warning threshold', async () => {
      const { wrapper } = await mountStats({ projectTotal: 8, config: { maxProjectsPerOrg: 10 } })
      expect(quotaBar(wrapper, 'Projects')?.classes().join(' ')).not.toContain('destructive')
    })

    it('should cap the bar at 100% when the quota is already exceeded', async () => {
      // Quotas can be lowered under existing usage; the bar must not overflow.
      const { wrapper } = await mountStats({ projectTotal: 25, config: { maxProjectsPerOrg: 10 } })
      expect(quotaBar(wrapper, 'Projects')?.attributes('style')).toContain('width: 100%')
    })
  })
})
