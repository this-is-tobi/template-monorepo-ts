import path from 'node:path'
import { deepMerge, snakeCaseToCamelCase } from '@template-monorepo-ts/shared'
import { z } from 'zod'
import { getNodeEnv } from './functions.js'

const configPaths = {
  development: path.resolve(__dirname, '../../config-example.json'),
  production: '/app/config.json',
  test: path.resolve(__dirname, './configs/config.valid.spec.json'),
}

const CONFIG_PATH = configPaths[getNodeEnv()]
const ENV_PREFIX = ['API__', 'DB__', 'DOC__', 'AUTH__', 'KEYCLOAK__', 'ADMIN__', 'MODULES__']

/** Helper — Zod schema for a boolean-like config toggle (accepts string `"true"` from env vars). */
function boolToggle(defaultValue: boolean) {
  return z.union([z.string(), z.boolean()]).default(defaultValue).transform((arg) => {
    if (typeof arg === 'string') return arg === 'true'
    return arg
  })
}

export const ConfigSchema = z.object({
  api: z.object({
    host: z.string().default('127.0.0.1'),
    port: z.union([z.string(), z.number()]).default(8081).transform((arg, _ctx) => Number(arg)),
    domain: z.string().default('127.0.0.1:8081'),
    version: z.string().default('dev'),
  }).default(() => ({
    host: '127.0.0.1',
    port: 8081,
    domain: '127.0.0.1:8081',
    version: 'dev',
  })),
  db: z.object({
    url: z.string().default(''),
    prismaSchemaPath: z.string().default(path.resolve(__dirname, '../../prisma/schema.prisma')),
  }).default(() => ({
    url: '',
    prismaSchemaPath: path.resolve(__dirname, '../../prisma/schema.prisma'),
  })),
  auth: z.object({
    secret: z.string().default('change-me-in-production-use-256-bit-random'),
    baseUrl: z.string().default('http://127.0.0.1:8081'),
    trustedOrigins: z.union([z.string(), z.array(z.string())]).default('http://localhost:3000').transform((arg) => {
      if (typeof arg === 'string') {
        return arg.split(',').map(s => s.trim())
      }
      return arg
    }),
    redisUrl: z.string().default(''),
  }).default(() => ({
    secret: 'change-me-in-production-use-256-bit-random',
    baseUrl: 'http://127.0.0.1:8081',
    trustedOrigins: ['http://localhost:3000'],
    redisUrl: '',
  })),
  keycloak: z.object({
    enabled: boolToggle(false),
    clientId: z.string().default(''),
    clientSecret: z.string().default(''),
    issuer: z.string().default(''),
    mapRoles: boolToggle(false),
    mapGroups: boolToggle(false),
  }).default(() => ({
    enabled: false,
    clientId: '',
    clientSecret: '',
    issuer: '',
    mapRoles: false,
    mapGroups: false,
  })),
  admin: z.object({
    email: z.string().default(''),
    password: z.string().default(''),
  }).default(() => ({
    email: '',
    password: '',
  })),
  doc: z.object({
    url: z.string().optional(),
  }).optional(),
  modules: z.object({
    auth: boolToggle(true),
    audit: boolToggle(false),
  }).default(() => ({
    auth: true,
    audit: false,
  })),
}).strict()

export type Config = z.infer<typeof ConfigSchema>

export function parseEnv(obj: Record<string, string>): Config | Record<PropertyKey, never> {
  return Object
    .entries(obj)
    .map(([key, value]) => key
      .split('__')
      .toReversed()
      .reduce((acc, val, idx) => {
        if (!idx) {
          try {
            return { [snakeCaseToCamelCase(val)]: JSON.parse(value) }
          } catch (_e) {
            return { [snakeCaseToCamelCase(val)]: value }
          }
        } else {
          return { [snakeCaseToCamelCase(val)]: acc }
        }
      }, {}))
    .reduce((acc, val) => deepMerge(acc, val), {})
}

export function getEnv(prefix: string | string[] = ENV_PREFIX): Record<string, string> {
  return Object
    .entries(process.env)
    .filter(([key, _value]) => Array.isArray(prefix) ? prefix.some(p => key.startsWith(p)) : key.startsWith(prefix))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
}

export async function getConfig(opts?: { fileConfigPath?: string, envPrefix?: string | string[] }) {
  const fileConfigPath = opts?.fileConfigPath ?? CONFIG_PATH
  const envPrefix = opts?.envPrefix ?? ENV_PREFIX

  const defaultConfig = ConfigSchema.parse({})
  let envConfig: Config | Record<PropertyKey, never> = {}
  let fileConfig: Config | Record<PropertyKey, never> = {}

  try {
    envConfig = parseEnv(getEnv(envPrefix))
    ConfigSchema.partial().parse(envConfig)
  } catch (error) {
    const errorMessage = { description: 'invalid config environment variables', error }
    throw new Error(JSON.stringify(errorMessage))
  }

  try {
    const file = await import(fileConfigPath, { assert: { type: 'json' } })
      .catch(_e => console.log(`no config file detected "${fileConfigPath}"`))
    if (file) {
      fileConfig = file.default
      ConfigSchema.partial().parse(fileConfig)
    }
  } catch (error) {
    const errorMessage = { description: `invalid config file "${fileConfigPath}"`, error }
    throw new Error(JSON.stringify(errorMessage))
  }

  return deepMerge(deepMerge(defaultConfig, fileConfig), envConfig) as Config
}

// eslint-disable-next-line antfu/no-top-level-await
export const config = await getConfig()
