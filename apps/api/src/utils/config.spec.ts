import { deepMerge } from '@template-monorepo-ts/shared'

const mockLogInfo = vi.fn()
const mockLogWarn = vi.fn()
vi.mock('@template-monorepo-ts/logger', () => ({
  createLogger: () => ({ info: mockLogInfo, warn: mockLogWarn, error: vi.fn(), debug: vi.fn(), trace: vi.fn(), fatal: vi.fn() }),
}))

const { ConfigSchema, getConfig, getEnv, parseEnv } = await import('./config.js')

const originalEnv = process.env
const testEnv = {
  SERVER__HOST: 'api.env.domain.com',
  SERVER__PORT: '4444',
  SERVER__DOMAIN: 'api.env.domain.com',
  DB__URL: 'postgresql://admin:admin@localhost:5432/test?schema=public',
  DB__PRISMA_SCHEMA_PATH: './prisma/schema.prisma',
  ENV__VAR1: 'env1',
  ENV__VAR2: 'env2',
  ENV__VAR3: '[{"0": "1"}, {"0": "2"}]',
}

describe('utils - config', () => {
  beforeEach(() => {
    vi.resetModules()
    globalThis.process.env = originalEnv
  })

  describe('parseEnv', () => {
    it('should parse environment variable object — strings preserved verbatim, only JSON literals coerced', () => {
      const env = parseEnv(testEnv)
      const expected = {
        server: {
          host: testEnv.SERVER__HOST,
          // Strings are preserved as-is; ConfigSchema's union transform
          // is responsible for coercing to Number when needed. This avoids
          // silently mutating secret values that happen to be numeric or
          // start with `[`/`{`.
          port: testEnv.SERVER__PORT,
          domain: testEnv.SERVER__DOMAIN,
        },
        db: {
          url: testEnv.DB__URL,
          prismaSchemaPath: testEnv.DB__PRISMA_SCHEMA_PATH,
        },
        env: {
          var1: testEnv.ENV__VAR1,
          var2: testEnv.ENV__VAR2,
          // Values that look like JSON arrays/objects are still parsed.
          var3: [{ 0: '1' }, { 0: '2' }],
        },
      }

      expect(env).toEqual(expected)
    })

    it('should parse nested env vars via double-underscore splitting (e.g. AUTH__REDIS__URL)', () => {
      const env = parseEnv({ AUTH__REDIS__URL: 'redis://localhost:6379' })
      expect(env).toEqual({ auth: { redis: { url: 'redis://localhost:6379' } } })
    })

    it('should preserve numeric-looking strings (regression: AUTH__SECRET=12345 must stay a string)', () => {
      const env = parseEnv({ AUTH__SECRET: '12345' })
      expect(env).toEqual({ auth: { secret: '12345' } })
    })

    it('should preserve strings that contain JSON-significant characters but are not valid JSON', () => {
      // `[hello]` is not valid JSON — must round-trip as a string.
      const env = parseEnv({ FOO__BAR: '[hello]' })
      expect(env).toEqual({ foo: { bar: '[hello]' } })
    })

    it('should still parse boolean and null literals', () => {
      const env = parseEnv({ FOO__BAR: 'true', FOO__BAZ: 'null' })
      expect(env).toEqual({ foo: { bar: true, baz: null } })
    })
  })

  describe('getEnv', () => {
    it('should retrieve environment variables with default prefix', () => {
      globalThis.process.env = testEnv

      const env = getEnv()
      const expected = {
        SERVER__HOST: testEnv.SERVER__HOST,
        SERVER__PORT: testEnv.SERVER__PORT,
        SERVER__DOMAIN: testEnv.SERVER__DOMAIN,
        DB__URL: testEnv.DB__URL,
        DB__PRISMA_SCHEMA_PATH: testEnv.DB__PRISMA_SCHEMA_PATH,
      }

      expect(env).toEqual(expected)
    })

    it('should retrieve environment variables with given prefix', () => {
      globalThis.process.env = testEnv

      const env = getEnv('ENV__')
      const expected = {
        ENV__VAR1: testEnv.ENV__VAR1,
        ENV__VAR2: testEnv.ENV__VAR2,
        ENV__VAR3: testEnv.ENV__VAR3,
      }

      expect(env).toEqual(expected)
    })

    it('should retrieve environment variables without prefix', () => {
      globalThis.process.env = testEnv

      const env = getEnv('')

      expect(env).toEqual(testEnv)
    })

    it('should not retrieve environment variables not matching prefix', () => {
      globalThis.process.env = testEnv

      const env = getEnv('NOT_AVAILABLE__')

      expect(env).toEqual({})
    })
  })

  describe('getConfig', () => {
    it('should retrieve config', async () => {
      globalThis.process.env = { NODE_ENV: 'test' }

      const testConfig = await import('./configs/config.valid.spec.json', { with: { type: 'json' } })
      const env = await getConfig()

      expect(env).toEqual(testConfig.default)
    })

    it('should retrieve config override by environment variables', async () => {
      globalThis.process.env = { ...testEnv, NODE_ENV: 'test' }
      const testConfig = await import('./configs/config.valid.spec.json', { with: { type: 'json' } })

      const env = await getConfig()
      // Mirror getConfig's pipeline: merge raw sources then run the full
      // schema once so all transforms (string→number for `port`, etc.) are
      // applied consistently.  parseEnv intentionally preserves strings.
      const expected = ConfigSchema.parse(
        deepMerge(
          deepMerge({}, testConfig.default),
          parseEnv(Object
            .entries(testEnv)
            .filter(([key, _value]) => key.startsWith('SERVER__') || key.startsWith('DB__'))
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})),
        ),
      )

      expect(env).toEqual(expected)
    })

    it('should throw an error if config env variables have an invalid schema', async () => {
      globalThis.process.env = testEnv

      try {
        await getConfig({ envPrefix: ['SERVER__', 'ENV__'] })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        const err = error as Error
        expect(JSON.parse(err.message).description).toEqual('invalid config environment variables')
        // The ZodError structure has changed in newer versions, we're just checking
        // that there's an error object present without checking specific format
        const errorObj = JSON.parse(err.message).error
        expect(errorObj).toBeDefined()
      }
    })

    it('should throw an error if config file have an invalid schema', async () => {
      globalThis.process.env = {}

      try {
        await getConfig({ fileConfigPath: './configs/config.invalid.spec.json' })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        const err = error as Error
        expect(JSON.parse(err.message).description).toEqual('invalid config file "./configs/config.invalid.spec.json"')
        // The ZodError structure has changed in newer versions, we're just checking
        // that there's an error object present without checking specific format
        const errorObj = JSON.parse(err.message).error
        expect(errorObj).toBeDefined()
      }
    })

    it('should proceed gracefully when the config file does not exist', async () => {
      globalThis.process.env = { NODE_ENV: 'test' }

      // Non-existent path triggers the .catch() on the dynamic import
      const result = await getConfig({ fileConfigPath: './configs/non-existent.json' })

      expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('no config file detected'))
      expect(result).toBeDefined()
    })

    it('should throw when AUTH__SECRET is the default placeholder in production', async () => {
      globalThis.process.env = { NODE_ENV: 'production' }

      await expect(getConfig()).rejects.toThrow('AUTH__SECRET must be set in production')
    })

    describe('override order: schema defaults < file < env vars', () => {
      it('should use schema defaults when neither file nor env provides a value', async () => {
        globalThis.process.env = { NODE_ENV: 'test' }

        // A non-existent file path forces the file layer to be skipped entirely.
        const result = await getConfig({ fileConfigPath: './configs/non-existent.json', envPrefix: [] })

        expect(result.server.host).toBe('127.0.0.1')
        expect(result.server.port).toBe(8081)
        expect(result.db.url).toBe('')
      })

      it('should use file values over schema defaults', async () => {
        globalThis.process.env = { NODE_ENV: 'test' }

        // config.valid.spec.json sets server.host = "api.config.domain.com" and port = 5555,
        // which differ from the schema defaults (127.0.0.1 / 8081).
        const result = await getConfig({ envPrefix: [] })

        expect(result.server.host).toBe('api.config.domain.com')
        expect(result.server.port).toBe(5555)
      })

      it('should use env var values over file values', async () => {
        // The file sets server.host = "api.config.domain.com"; the env var overrides it.
        globalThis.process.env = { SERVER__HOST: 'api.env.domain.com', NODE_ENV: 'test' }

        const result = await getConfig()

        expect(result.server.host).toBe('api.env.domain.com')
      })

      it('should deep-merge env vars with file, not replace the whole object', async () => {
        // The file sets server.host and server.port; the env var only overrides port.
        // server.host must still come from the file, not the schema default.
        globalThis.process.env = { SERVER__PORT: '9999', NODE_ENV: 'test' }

        const result = await getConfig()

        expect(result.server.port).toBe(9999)
        expect(result.server.host).toBe('api.config.domain.com')
      })
    })
  })

  describe('configSchema', () => {
    it('should accept trustedOrigins as an array and return it unchanged', () => {
      const result = ConfigSchema.parse({
        auth: { trustedOrigins: ['http://a.example.com', 'http://b.example.com'] },
      })
      expect(result.auth.trustedOrigins).toEqual(['http://a.example.com', 'http://b.example.com'])
    })

    it('should split comma-separated trustedOrigins string into an array', () => {
      const result = ConfigSchema.parse({
        auth: { trustedOrigins: 'http://a.example.com, http://b.example.com' },
      })
      expect(result.auth.trustedOrigins).toEqual(['http://a.example.com', 'http://b.example.com'])
    })
  })
})
