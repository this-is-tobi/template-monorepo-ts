import path from 'node:path'
import { z } from 'zod'
import { deepMerge, snakeCaseToCamelCase } from '@template-monorepo-ts/shared'
import { getNodeEnv } from './functions.ts'

const configPaths = {
  development: path.resolve(__dirname, '../../config-example.json'),
  production: '/app/config.json',
  test: path.resolve(__dirname, './configs/config.valid.spec.json'),
}

const CONFIG_PATH = configPaths[getNodeEnv()]
const ENV_PREFIX = ['API__', 'DOC__']

export const ConfigSchema = z.object({
  api: z.object({
    host: z.string().default('127.0.0.1'),
    port: z.union([z.string(), z.number()]).default(8081).transform((arg, _ctx) => Number(arg)),
    domain: z.string().default('127.0.0.1:8081'),
    version: z.string().default('dev'),
    dbUrl: z.string().default(''),
    prismaSchemaPath: z.string().default('/app/schema.prisma'),
  }).default({}),
  doc: z.object({
    url: z.string().optional(),
  }).optional(),
}).strict()

export type Config = Zod.infer<typeof ConfigSchema>

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
      // eslint-disable-next-line no-console
      .catch(_e => console.log(`no config file detected "${fileConfigPath}"`))
    if (file) {
      fileConfig = file.default
      ConfigSchema.partial().parse(fileConfig)
    }
  } catch (error) {
    const errorMessage = { description: `invalid config file "${fileConfigPath}"`, error }
    throw new Error(JSON.stringify(errorMessage))
  }

  return {
    ...defaultConfig,
    ...fileConfig,
    ...envConfig,
  }
}

export const config = await getConfig()
