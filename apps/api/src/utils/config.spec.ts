import { vi, describe, it, expect, beforeEach } from 'vitest'
import { deepMerge } from '@template-monorepo-ts/shared'
import { ConfigSchema, getConfig, getEnv, parseEnv } from './index.js'

const originalEnv = process.env
const testEnv = {
  API__HOST: 'api.env.domain.com',
  API__PORT: '4444',
  API__DOMAIN: 'api.env.domain.com',
  API__VERSION: 'env',
  ENV__VAR1: 'env1',
  ENV__VAR2: 'env2',
  ENV__VAR3: '[{"0": "1"}, {"0": "2"}]',
}

describe('Utils - config', () => {
  beforeEach(() => {
    vi.resetModules()
    global.process.env = originalEnv
  })

  describe('parseEnv', () => {
    it('Should parse environment variable object', () => {
      const env = parseEnv(testEnv)
      const expected = {
        api: {
          host: testEnv.API__HOST,
          port: Number(testEnv.API__PORT),
          domain: testEnv.API__DOMAIN,
          version: testEnv.API__VERSION,
        },
        env: {
          var1: testEnv.ENV__VAR1,
          var2: testEnv.ENV__VAR2,
          var3: [{ 0: '1' }, { 0: '2' }],
        },
      }

      expect(env).toEqual(expected)
    })
  })

  describe('getEnv', () => {
    it('Should retieve environment variables with default prefix', () => {
      global.process.env = testEnv

      const env = getEnv()
      const expected = {
        API__HOST: testEnv.API__HOST,
        API__PORT: testEnv.API__PORT,
        API__DOMAIN: testEnv.API__DOMAIN,
        API__VERSION: testEnv.API__VERSION,
      }

      expect(env).toEqual(expected)
    })

    it('Should retieve environment variables with given prefix', () => {
      global.process.env = testEnv

      const env = getEnv('ENV__')
      const expected = {
        ENV__VAR1: testEnv.ENV__VAR1,
        ENV__VAR2: testEnv.ENV__VAR2,
        ENV__VAR3: testEnv.ENV__VAR3,
      }

      expect(env).toEqual(expected)
    })

    it('Should retieve environment variables without prefix', () => {
      global.process.env = testEnv

      const env = getEnv('')

      expect(env).toEqual(testEnv)
    })

    it('Should not retrieve environment variables not matching prefix', () => {
      global.process.env = testEnv

      const env = getEnv('NOT_AVAILABLE__')

      expect(env).toEqual({})
    })
  })

  describe('getConfig', () => {
    it('Should retieve config', async () => {
      global.process.env = {}

      const testConfig = await import('./configs/config.valid.spec.json', { assert: { type: 'json' } })
      const env = await getConfig()

      expect(env).toEqual(testConfig.default)
    })

    it('Should retieve config override by environment variables', async () => {
      global.process.env = testEnv
      const testConfig = await import('./configs/config.valid.spec.json', { assert: { type: 'json' } })

      const env = await getConfig()
      const expected = deepMerge(
        // default config
        ConfigSchema.parse({}),
        deepMerge(
          // environment config
          testConfig.default,
          // file config
          parseEnv(Object
            .entries(testEnv)
            .filter(([key, _value]) => key.startsWith('API__'))
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})),
        ),
      )

      expect(env).toEqual(expected)
    })

    it('Should throw an error if config env variables have an invalid schema', async () => {
      global.process.env = testEnv

      try {
        await getConfig({ envPrefix: ['API__', 'ENV__'] })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        // @ts-ignore there is a message property on the error object
        expect(JSON.parse(error?.message).description).toEqual('invalid config environment variables')
        // @ts-ignore there is a message property on the error object
        expect(JSON.parse(error?.message).error.issues[0].message).toEqual('Unrecognized key(s) in object: \'env\'')
      }
    })

    it('Should throw an error if config file have an invalid schema', async () => {
      global.process.env = {}

      try {
        await getConfig({ fileConfigPath: './configs/config.invalid.spec.json' })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        // @ts-ignore there is a message property on the error object
        expect(JSON.parse(error?.message).description).toEqual('invalid config file "./configs/config.invalid.spec.json"')
        // @ts-ignore there is a message property on the error object
        expect(JSON.parse(error?.message).error.issues[0].message).toEqual('Unrecognized key(s) in object: \'config\'')
      }
    })
  })
})
