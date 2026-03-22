import { describe, expect, it, vi } from 'vitest'

vi.mock('@template-monorepo-ts/shared', () => ({
  getApiClient: vi.fn((baseUrl: string) => ({ baseUrl })),
}))

describe('apiClient', () => {
  it('should fall back to window.location.origin when config apiUrl is unresolved', async () => {
    vi.doMock('~/lib/config', () => ({
      config: { apiUrl: '' },
    }))
    vi.resetModules()
    const { apiClient } = await import('./api')
    expect((apiClient as unknown as { baseUrl: string }).baseUrl).toBe(window.location.origin)
  })

  it('should use configured API URL when set', async () => {
    vi.doMock('~/lib/config', () => ({
      config: { apiUrl: 'https://api.example.com' },
    }))
    vi.resetModules()
    const { apiClient } = await import('./api')
    expect((apiClient as unknown as { baseUrl: string }).baseUrl).toBe('https://api.example.com')
  })

  it('should fall back to origin when config apiUrl is empty', async () => {
    vi.doMock('~/lib/config', () => ({
      config: { apiUrl: '' },
    }))
    vi.resetModules()
    const { apiClient } = await import('./api')
    expect((apiClient as unknown as { baseUrl: string }).baseUrl).toBe(window.location.origin)
  })
})
