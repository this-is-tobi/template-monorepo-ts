import type { RuntimeConfigEntry } from '@template-monorepo-ts/shared'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountPage } from '~/test/helpers'
import SettingsRuntimeConfig from './SettingsRuntimeConfig.vue'

const { mockGetRuntime } = vi.hoisted(() => ({ mockGetRuntime: vi.fn() }))

vi.mock('~/lib/api', () => ({
  apiClient: { config: { getRuntime: mockGetRuntime } },
}))

function entry(over: Partial<RuntimeConfigEntry> = {}): RuntimeConfigEntry {
  return {
    path: 'server.port',
    envVar: 'SERVER__PORT',
    value: '8081',
    source: 'default',
    secret: false,
    isSet: true,
    ...over,
  }
}

async function mountRuntime(entries: RuntimeConfigEntry[]) {
  mockGetRuntime.mockResolvedValue({ data: { entries } })
  const mounted = await mountPage(SettingsRuntimeConfig)
  await flushPromises()
  return mounted
}

describe('settingsRuntimeConfig', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should list each option with its env var name and source', async () => {
    const { wrapper } = await mountRuntime([
      entry({ path: 'server.host', envVar: 'SERVER__HOST', value: '0.0.0.0', source: 'env' }),
    ])

    const text = wrapper.text()
    expect(text).toContain('SERVER__HOST')
    expect(text).toContain('server.host')
    expect(text).toContain('0.0.0.0')
    expect(text).toContain('env')
  })

  it('should group options by their top-level section', async () => {
    const { wrapper } = await mountRuntime([
      entry({ path: 'server.port' }),
      entry({ path: 'auth.baseUrl', envVar: 'AUTH__BASE_URL', value: 'http://x' }),
    ])

    const headings = wrapper.findAll('h4').map(h => h.text())
    expect(headings).toStrictEqual(['server', 'auth'])
  })

  it('should never render a secret value, only whether one is set', async () => {
    const { wrapper } = await mountRuntime([
      entry({ path: 'auth.secret', envVar: 'AUTH__SECRET', value: null, secret: true, isSet: true }),
      entry({ path: 'oidc.clientSecret', envVar: 'OIDC__CLIENT_SECRET', value: null, secret: true, isSet: false }),
    ])

    const text = wrapper.text()
    expect(text).toContain('•••••••• (set)')
    expect(text).toContain('not set')
    expect(text).toContain('AUTH__SECRET')
  })

  it('should mark unset non-secret options rather than showing a blank cell', async () => {
    const { wrapper } = await mountRuntime([
      entry({ path: 'oidc.issuer', envVar: 'OIDC__ISSUER', value: '', isSet: false }),
    ])

    expect(wrapper.text()).toContain('not set')
  })

  it('should summarise how many options are explicitly set', async () => {
    const { wrapper } = await mountRuntime([
      entry({ path: 'server.port', source: 'env' }),
      entry({ path: 'server.host', envVar: 'SERVER__HOST', source: 'file' }),
      entry({ path: 'server.domain', envVar: 'SERVER__DOMAIN', source: 'default' }),
    ])

    expect(wrapper.text()).toContain('2 of 3 options explicitly set')
  })

  it('should filter by option name', async () => {
    const { wrapper } = await mountRuntime([
      entry({ path: 'server.port', envVar: 'SERVER__PORT' }),
      entry({ path: 'auth.baseUrl', envVar: 'AUTH__BASE_URL' }),
    ])

    await wrapper.find('input[type="search"]').setValue('auth')
    await flushPromises()

    expect(wrapper.text()).toContain('AUTH__BASE_URL')
    expect(wrapper.text()).not.toContain('SERVER__PORT')
  })

  it('should refetch when the refresh token changes', async () => {
    mockGetRuntime.mockResolvedValue({ data: { entries: [entry()] } })
    const { wrapper } = await mountPage(SettingsRuntimeConfig, { props: { refreshToken: 0 } })
    await flushPromises()
    expect(mockGetRuntime).toHaveBeenCalledTimes(1)

    // Widened: `mountPage` erases the component's prop types behind a cast.
    const nextProps: Record<string, unknown> = { refreshToken: 1 }
    await wrapper.setProps(nextProps)
    await flushPromises()
    expect(mockGetRuntime).toHaveBeenCalledTimes(2)
  })

  it('should degrade quietly when the endpoint is unavailable', async () => {
    mockGetRuntime.mockRejectedValue(new Error('403'))
    const { wrapper } = await mountPage(SettingsRuntimeConfig)
    await flushPromises()

    expect(wrapper.text()).toContain('Could not load the runtime configuration')
  })
})
