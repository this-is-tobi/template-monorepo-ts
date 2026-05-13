/* eslint-disable no-template-curly-in-string */
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    delete window.__APP_CONFIG__
  })

  it('should use runtime config when __APP_CONFIG__ has a real value', async () => {
    window.__APP_CONFIG__ = { apiUrl: 'https://runtime.example.com' }
    const { config } = await import('./config')
    expect(config.apiUrl).toBe('https://runtime.example.com')
  })

  it('should fall back to VITE_API_URL when runtime value is empty (envsubst unset)', async () => {
    window.__APP_CONFIG__ = { apiUrl: '' }
    vi.stubEnv('VITE_API_URL', 'https://vite.example.com')
    const { config } = await import('./config')
    expect(config.apiUrl).toBe('https://vite.example.com')
  })

  it('should fall back to VITE_API_URL when placeholder is unreplaced (dev mode)', async () => {
    window.__APP_CONFIG__ = { apiUrl: '${API_URL}' }
    vi.stubEnv('VITE_API_URL', 'https://vite.example.com')
    const { config } = await import('./config')
    expect(config.apiUrl).toBe('https://vite.example.com')
  })

  it('should return empty string when neither runtime nor VITE_ is set', async () => {
    window.__APP_CONFIG__ = { apiUrl: '' }
    vi.stubEnv('VITE_API_URL', '')
    const { config } = await import('./config')
    expect(config.apiUrl).toBe('')
  })

  it('should handle missing __APP_CONFIG__ gracefully', async () => {
    vi.stubEnv('VITE_API_URL', 'https://fallback.example.com')
    const { config } = await import('./config')
    expect(config.apiUrl).toBe('https://fallback.example.com')
  })

  it('should export APP_VERSION baked in from package.json', async () => {
    const { APP_VERSION } = await import('./config')
    expect(typeof APP_VERSION).toBe('string')
    expect(APP_VERSION.length).toBeGreaterThan(0)
  })
})
