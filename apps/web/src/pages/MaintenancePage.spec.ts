import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { useConfigStore } from '~/stores/config'
import { mountPage } from '~/test/helpers'
import MaintenancePage from './MaintenancePage.vue'

describe('maintenancePage', () => {
  it('renders without errors', async () => {
    const { wrapper } = await mountPage(MaintenancePage)
    expect(wrapper.exists()).toBe(true)
  })

  it('displays the maintenance heading', async () => {
    const { wrapper } = await mountPage(MaintenancePage)
    await flushPromises()
    expect(wrapper.text()).toContain('Under maintenance')
  })

  it('displays a maintenance message', async () => {
    const { wrapper } = await mountPage(MaintenancePage)
    await flushPromises()
    expect(wrapper.text()).toContain('currently undergoing scheduled maintenance')
  })

  it('shows the app name from the config store', async () => {
    const { wrapper } = await mountPage(MaintenancePage)
    const configStore = useConfigStore()
    configStore.config.appName = 'My Custom App'
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('My Custom App')
  })

  it('tells users to check back soon', async () => {
    const { wrapper } = await mountPage(MaintenancePage)
    await flushPromises()
    expect(wrapper.text()).toContain('check back soon')
  })
})
