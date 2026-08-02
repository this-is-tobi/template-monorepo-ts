import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useApiKeysStore } from '~/stores/api-keys'
import { daysFromNow, mockApiKey, mountPage } from '~/test/helpers'
import DashboardExpiringKeys from './DashboardExpiringKeys.vue'

/** Mount, then seed the store — the widget fetches on mount. */
async function mountWithKeys(keys: ReturnType<typeof mockApiKey>[]) {
  const mounted = await mountPage(DashboardExpiringKeys)
  useApiKeysStore().apiKeys = keys
  await flushPromises()
  return mounted
}

describe('dashboardExpiringKeys', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('what counts as expiring', () => {
    it('should list a key inside the seven-day window', async () => {
      const { wrapper } = await mountWithKeys([mockApiKey({ name: 'CI deploy key', expiresAt: daysFromNow(3) })])
      expect(wrapper.text()).toContain('CI deploy key')
      expect(wrapper.text()).toContain('Keys expiring soon')
    })

    it('should ignore a key expiring beyond the window', async () => {
      const { wrapper } = await mountWithKeys([mockApiKey({ name: 'Far future', expiresAt: daysFromNow(30) })])
      expect(wrapper.text()).not.toContain('Far future')
    })

    it('should ignore a key that never expires', async () => {
      const { wrapper } = await mountWithKeys([mockApiKey({ name: 'Eternal', expiresAt: null })])
      expect(wrapper.text()).not.toContain('Eternal')
    })

    it('should ignore a key that already expired', async () => {
      // Nothing to act on any more — surfacing it is noise, not a warning.
      const { wrapper } = await mountWithKeys([mockApiKey({ name: 'Long gone', expiresAt: daysFromNow(-1) })])
      expect(wrapper.text()).not.toContain('Long gone')
    })

    it('should ignore a disabled key even inside the window', async () => {
      const { wrapper } = await mountWithKeys([
        mockApiKey({ id: 'k1', name: 'Revoked key', enabled: false, expiresAt: daysFromNow(2) }),
      ])
      expect(wrapper.text()).not.toContain('Revoked key')
    })
  })

  describe('rendering', () => {
    it('should render nothing at all when no key needs attention', async () => {
      // The card is a call to action; an empty one is just clutter.
      const { wrapper } = await mountWithKeys([mockApiKey({ expiresAt: null })])
      expect(wrapper.text()).not.toContain('Keys expiring soon')
    })

    it('should fall back to the prefix when a key has no name', async () => {
      const { wrapper } = await mountWithKeys([
        mockApiKey({ name: null, prefix: 'tmts', expiresAt: daysFromNow(1) }),
      ])
      expect(wrapper.text()).toContain('tmts')
    })

    it('should label a key with neither name nor prefix', async () => {
      const { wrapper } = await mountWithKeys([
        mockApiKey({ name: null, prefix: null, expiresAt: daysFromNow(1) }),
      ])
      expect(wrapper.text()).toContain('Unnamed key')
    })

    it('should list every expiring key, not just the first', async () => {
      const { wrapper } = await mountWithKeys([
        mockApiKey({ id: 'k1', name: 'First key', expiresAt: daysFromNow(1) }),
        mockApiKey({ id: 'k2', name: 'Second key', expiresAt: daysFromNow(5) }),
      ])
      expect(wrapper.text()).toContain('First key')
      expect(wrapper.text()).toContain('Second key')
    })
  })
})
