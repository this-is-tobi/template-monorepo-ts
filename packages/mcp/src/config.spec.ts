import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveConfig } from './config.js'

describe('resolveConfig', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.TMTS_SERVER_URL
    delete process.env.TMTS_TOKEN
    delete process.env.TMTS_API_KEY
    delete process.env.TMTS_TRANSPORT
    delete process.env.TMTS_HTTP_HOST
    delete process.env.TMTS_HTTP_PORT
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('throws when TMTS_SERVER_URL is not set', () => {
    expect(() => resolveConfig()).toThrow('No server URL configured')
  })

  it('resolves serverUrl from TMTS_SERVER_URL', () => {
    process.env.TMTS_SERVER_URL = 'http://localhost:8081'

    const config = resolveConfig()

    expect(config.serverUrl).toBe('http://localhost:8081')
  })

  it('resolves token from TMTS_TOKEN', () => {
    process.env.TMTS_SERVER_URL = 'http://localhost:8081'
    process.env.TMTS_TOKEN = 'my-token'

    const config = resolveConfig()

    expect(config.token).toBe('my-token')
  })

  it('resolves apiKey from TMTS_API_KEY', () => {
    process.env.TMTS_SERVER_URL = 'http://localhost:8081'
    process.env.TMTS_API_KEY = 'my-key'

    const config = resolveConfig()

    expect(config.apiKey).toBe('my-key')
  })

  it('returns undefined for token and apiKey when not set', () => {
    process.env.TMTS_SERVER_URL = 'http://localhost:8081'

    const config = resolveConfig()

    expect(config.token).toBeUndefined()
    expect(config.apiKey).toBeUndefined()
  })

  it('resolves all config values together', () => {
    process.env.TMTS_SERVER_URL = 'http://api.example.com'
    process.env.TMTS_TOKEN = 'bearer-token'
    process.env.TMTS_API_KEY = 'api-key-123'

    const config = resolveConfig()

    expect(config).toEqual({
      serverUrl: 'http://api.example.com',
      token: 'bearer-token',
      apiKey: 'api-key-123',
      transport: 'stdio',
      http: {
        host: '0.0.0.0',
        port: 3100,
      },
    })
  })

  it('defaults transport to stdio', () => {
    process.env.TMTS_SERVER_URL = 'http://localhost:8081'

    const config = resolveConfig()

    expect(config.transport).toBe('stdio')
  })

  it('resolves transport from TMTS_TRANSPORT', () => {
    process.env.TMTS_SERVER_URL = 'http://localhost:8081'
    process.env.TMTS_TRANSPORT = 'http'

    const config = resolveConfig()

    expect(config.transport).toBe('http')
  })

  it('throws on invalid transport value', () => {
    process.env.TMTS_SERVER_URL = 'http://localhost:8081'
    process.env.TMTS_TRANSPORT = 'websocket'

    expect(() => resolveConfig()).toThrow('Invalid transport')
  })

  it('resolves HTTP config from env vars', () => {
    process.env.TMTS_SERVER_URL = 'http://localhost:8081'
    process.env.TMTS_HTTP_HOST = '127.0.0.1'
    process.env.TMTS_HTTP_PORT = '9000'

    const config = resolveConfig()

    expect(config.http).toEqual({
      host: '127.0.0.1',
      port: 9000,
    })
  })

  it('uses default HTTP config values', () => {
    process.env.TMTS_SERVER_URL = 'http://localhost:8081'

    const config = resolveConfig()

    expect(config.http).toEqual({
      host: '0.0.0.0',
      port: 3100,
    })
  })
})
