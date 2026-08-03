import { deepMerge } from '@template-monorepo-ts/shared'

const mockLogInfo = vi.fn()
const mockLogWarn = vi.fn()
vi.mock('@template-monorepo-ts/logger', () => ({
  createLogger: () => ({ info: mockLogInfo, warn: mockLogWarn, error: vi.fn(), debug: vi.fn(), trace: vi.fn(), fatal: vi.fn() }),
}))

const { collectConfigLeaves, collectEnvVarNames, ConfigSchema, describeConfigEntries, getConfig, getEnv, isSecretConfigPath, parseEnv, warnUnknownEnvVars } = await import('./config.js')

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

      await expect(getConfig({ envPrefix: ['SERVER__', 'ENV__'] }))
        .rejects
        .toThrow('invalid config environment variables')
    })

    it('should throw an actionable error when an object option receives a scalar', async () => {
      globalThis.process.env = { NODE_ENV: 'test', MODULES__AUDIT: 'true' }

      // The message must name the env var and list the nested keys to use
      // instead — this is the "MODULES__AUDIT=true" foot-gun.
      await expect(getConfig()).rejects.toThrow(/MODULES__AUDIT.*use nested keys.*MODULES__AUDIT__ENABLED/s)
    })

    it('should throw an error if config file have an invalid schema', async () => {
      globalThis.process.env = {}

      await expect(getConfig({ fileConfigPath: './configs/config.invalid.spec.json' }))
        .rejects
        .toThrow('invalid config file "./configs/config.invalid.spec.json"')
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

    // The bootstrap account holds the platform `admin` role, and `isAdmin`
    // skips every org and project check — so `admin`/`admin`, shipped in the
    // example env files, was a full takeover of any instance deployed as-is.
    describe('bootstrap admin password', () => {
      const productionEnv = {
        NODE_ENV: 'production',
        AUTH__SECRET: 'a-real-secret-value-for-tests-0123456789',
        BOOTSTRAP__EMAIL: 'admin@example.com',
      }

      it.each([
        'admin',
        'Admin',
        'password',
        'changeme',
        'change-me-in-production',
      ])('should refuse to boot in production on the placeholder %j', async (password) => {
        globalThis.process.env = { ...productionEnv, BOOTSTRAP__PASSWORD: password }

        await expect(getConfig()).rejects.toThrow(/BOOTSTRAP__PASSWORD is one of the example placeholder values/)
      })

      it('should refuse to boot in production on a short password', async () => {
        globalThis.process.env = { ...productionEnv, BOOTSTRAP__PASSWORD: 'sh0rt-one' }

        await expect(getConfig()).rejects.toThrow(/BOOTSTRAP__PASSWORD is shorter than 12 characters/)
      })

      it('should boot in production on a strong password', async () => {
        globalThis.process.env = { ...productionEnv, BOOTSTRAP__PASSWORD: 'Nn4vH2pQ7xLd-strong' }

        const result = await getConfig()

        expect(result.bootstrap.password).toBe('Nn4vH2pQ7xLd-strong')
      })

      it('should boot in production when no bootstrap account is asked for', async () => {
        // An empty password skips the bootstrap step entirely — nothing to guard.
        globalThis.process.env = { ...productionEnv, BOOTSTRAP__PASSWORD: '' }

        const result = await getConfig()

        expect(result.bootstrap.password).toBe('')
      })

      it('should warn rather than throw outside production', async () => {
        globalThis.process.env = { NODE_ENV: 'test', BOOTSTRAP__PASSWORD: 'admin' }

        const result = await getConfig()

        expect(result.bootstrap.password).toBe('admin')
        expect(mockLogWarn).toHaveBeenCalledWith(expect.stringContaining('BOOTSTRAP__PASSWORD'))
      })
    })

    it('should refuse to boot with passwords off and no identity provider', async () => {
      // Otherwise the instance comes up healthy with a login page nobody can
      // use — better to fail loudly at startup than to lock everyone out.
      globalThis.process.env = { NODE_ENV: 'test', AUTH__EMAIL_PASSWORD__ENABLED: 'false' }

      await expect(getConfig()).rejects.toThrow(/AUTH__EMAIL_PASSWORD__ENABLED=false requires an identity provider/)
    })

    it('should allow passwords off when OIDC is enabled', async () => {
      globalThis.process.env = { NODE_ENV: 'test', AUTH__EMAIL_PASSWORD__ENABLED: 'false', OIDC__ENABLED: 'true' }

      const result = await getConfig()

      expect(result.auth.emailPassword.enabled).toBe(false)
      expect(result.oidc.enabled).toBe(true)
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

    describe('auth.emailPassword', () => {
      it('should default to on', () => {
        expect(ConfigSchema.parse({}).auth.emailPassword.enabled).toBe(true)
        expect(ConfigSchema.parse({ auth: { secret: 'x' } }).auth.emailPassword.enabled).toBe(true)
      })

      it('should read the env-var string form', () => {
        expect(ConfigSchema.parse({ auth: { emailPassword: { enabled: 'false' } } }).auth.emailPassword.enabled).toBe(false)
        expect(ConfigSchema.parse({ auth: { emailPassword: { enabled: false } } }).auth.emailPassword.enabled).toBe(false)
      })

      it('should be reachable as AUTH__EMAIL_PASSWORD__ENABLED', () => {
        expect(collectEnvVarNames()).toContain('AUTH__EMAIL_PASSWORD__ENABLED')
        expect(parseEnv({ AUTH__EMAIL_PASSWORD__ENABLED: 'false' }))
          .toEqual({ auth: { emailPassword: { enabled: false } } })
      })
    })

    describe('server.trustProxy', () => {
      it('should default to off, so a forged X-Forwarded-For cannot set request.ip', () => {
        expect(ConfigSchema.parse({}).server.trustProxy).toBe(false)
        expect(ConfigSchema.parse({ server: { port: 1234 } }).server.trustProxy).toBe(false)
      })

      it.each([
        [true, true],
        [false, false],
        ['true', true],
        ['false', false],
        ['', false],
      ])('should read %p as %p', (input, expected) => {
        expect(ConfigSchema.parse({ server: { trustProxy: input } }).server.trustProxy).toBe(expected)
      })

      it('should read a numeric value as a hop count', () => {
        expect(ConfigSchema.parse({ server: { trustProxy: '2' } }).server.trustProxy).toBe(2)
        expect(ConfigSchema.parse({ server: { trustProxy: 1 } }).server.trustProxy).toBe(1)
      })

      it('should keep a trusted-address list as a string for proxy-addr', () => {
        expect(ConfigSchema.parse({ server: { trustProxy: '10.0.0.0/8,192.168.0.0/16' } }).server.trustProxy)
          .toBe('10.0.0.0/8,192.168.0.0/16')
        expect(ConfigSchema.parse({ server: { trustProxy: 'uniquelocal' } }).server.trustProxy).toBe('uniquelocal')
      })
    })
  })

  describe('collectEnvVarNames', () => {
    it('should list every leaf option as a __-joined SNAKE_CASE env var name', () => {
      const names = collectEnvVarNames()
      expect(names).toContain('AUTH__REDIS__URL')
      expect(names).toContain('MODULES__AUDIT__ENABLED')
      expect(names).toContain('PLATFORM__AUDIT_RETENTION_DAYS')
      expect(names).toContain('OIDC__ORG_ROLE__PREFIX')
      expect(names).toContain('PLATFORM__MAX_ORGANIZATIONS_PER_USER')
    })

    it('should not list intermediate objects as env var names', () => {
      const names = collectEnvVarNames()
      expect(names).not.toContain('MODULES__AUDIT')
      expect(names).not.toContain('AUTH__REDIS')
    })
  })

  describe('isSecretConfigPath', () => {
    it('should redact anything named like a secret, including options added later', () => {
      expect(isSecretConfigPath('auth.secret')).toBe(true)
      expect(isSecretConfigPath('oidc.clientSecret')).toBe(true)
      expect(isSecretConfigPath('bootstrap.password')).toBe(true)
      expect(isSecretConfigPath('auth.redis.sentinelPassword')).toBe(true)
      // Matched on the leaf name, so a future `auth.apiToken` is covered too.
      expect(isSecretConfigPath('auth.apiToken')).toBe(true)
    })

    it('should redact connection strings that embed credentials', () => {
      expect(isSecretConfigPath('db.url')).toBe(true)
      expect(isSecretConfigPath('db.readUrl')).toBe(true)
      expect(isSecretConfigPath('auth.redis.url')).toBe(true)
    })

    it('should not redact ordinary options', () => {
      expect(isSecretConfigPath('server.port')).toBe(false)
      expect(isSecretConfigPath('oidc.issuer')).toBe(false)
      expect(isSecretConfigPath('auth.baseUrl')).toBe(false)
    })
  })

  describe('describeConfigEntries', () => {
    const resolved = ConfigSchema.parse({
      server: { port: 9000 },
      auth: { secret: 'super-secret-value', trustedOrigins: 'https://a.test,https://b.test' },
    })

    it('should attribute each option to the layer that supplied it', () => {
      const entries = describeConfigEntries(resolved, {
        rawEnv: { server: { port: 9000 } },
        rawFile: { server: { host: '0.0.0.0' } },
      })

      const byPath = Object.fromEntries(entries.map(e => [e.path, e]))
      expect(byPath['server.port']!.source).toBe('env')
      expect(byPath['server.host']!.source).toBe('file')
      expect(byPath['server.domain']!.source).toBe('default')
    })

    it('should let env win over file for the same option', () => {
      const entries = describeConfigEntries(resolved, {
        rawEnv: { server: { port: 9000 } },
        rawFile: { server: { port: 1234 } },
      })

      expect(entries.find(e => e.path === 'server.port')!.source).toBe('env')
    })

    it('should never include a secret value in the payload', () => {
      const entries = describeConfigEntries(resolved, { rawEnv: {}, rawFile: {} })
      const secret = entries.find(e => e.path === 'auth.secret')!

      expect(secret.secret).toBe(true)
      expect(secret.value).toBeNull()
      // Still tells an operator whether one is configured.
      expect(secret.isSet).toBe(true)
      expect(JSON.stringify(entries)).not.toContain('super-secret-value')
    })

    it('should render list values readably', () => {
      const entries = describeConfigEntries(resolved, { rawEnv: {}, rawFile: {} })
      expect(entries.find(e => e.path === 'auth.trustedOrigins')!.value)
        .toBe('https://a.test, https://b.test')
    })

    it('should report unset options as not set rather than omitting them', () => {
      const entries = describeConfigEntries(resolved, { rawEnv: {}, rawFile: {} })
      const issuer = entries.find(e => e.path === 'oidc.issuer')!

      expect(issuer.isSet).toBe(false)
      expect(issuer.value).toBe('')
    })

    it('should list platform overrides only when actually pinned', () => {
      const withoutOverrides = describeConfigEntries(resolved, { rawEnv: {}, rawFile: {} })
      expect(withoutOverrides.some(e => e.path.startsWith('platform.'))).toBe(false)

      const pinned = ConfigSchema.parse({ platform: { appName: 'Pinned' } })
      const withOverride = describeConfigEntries(pinned, {
        rawEnv: { platform: { appName: 'Pinned' } },
        rawFile: {},
      })
      const entry = withOverride.find(e => e.path === 'platform.appName')!
      expect(entry).toMatchObject({ envVar: 'PLATFORM__APP_NAME', source: 'env', value: 'Pinned' })
      // Sibling platform options stay out — they defer to the database.
      expect(withOverride.filter(e => e.path.startsWith('platform.'))).toHaveLength(1)
    })

    it('should cover every option the schema declares', () => {
      const entries = describeConfigEntries(resolved, { rawEnv: {}, rawFile: {} })
      const nonPlatformLeaves = collectConfigLeaves().filter(l => !l.path.startsWith('platform.'))

      expect(entries.map(e => e.path).sort()).toEqual(nonPlatformLeaves.map(l => l.path).sort())
    })
  })

  describe('warnUnknownEnvVars', () => {
    it('should stay silent for valid names', () => {
      expect(warnUnknownEnvVars(['AUTH__REDIS__URL', 'MODULES__AUTH'])).toEqual([])
    })

    it('should suggest the correct spelling for nesting typos', () => {
      const warnings = warnUnknownEnvVars(['AUTH__REDIS_URL'])
      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toContain('did you mean "AUTH__REDIS__URL"')
      expect(mockLogWarn).toHaveBeenCalledWith(expect.stringContaining('AUTH__REDIS_URL'))
    })

    it('should flag names that match no option at all', () => {
      const warnings = warnUnknownEnvVars(['MODULES__NOT_A_MODULE'])
      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toContain('not a recognized config option')
    })
  })
})
