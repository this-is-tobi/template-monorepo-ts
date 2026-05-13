import path from 'node:path'
import { createLogger } from '@template-monorepo-ts/logger'
import { deepMerge, setApiBasePath, snakeCaseToCamelCase } from '@template-monorepo-ts/shared'
import { z } from 'zod'
// JSON import resolved at bundle time — the version string is inlined into the
// bundle by Bun, so no file-system access is needed at runtime in production.
import pkg from '../../package.json' with { type: 'json' }
import { getNodeEnv } from './functions.js'

export const APP_VERSION: string = (pkg as { version: string }).version

const configLogger = createLogger({ name: 'config' })

const configPaths = {
  development: path.resolve(__dirname, '../../config-example.json'),
  production: '/app/config.json',
  test: path.resolve(__dirname, './configs/config.valid.spec.json'),
}

const CONFIG_PATH = configPaths[getNodeEnv()]
const ENV_PREFIX = ['SERVER__', 'DB__', 'AUTH__', 'OIDC__', 'BOOTSTRAP__', 'MODULES__', 'PLATFORM__']

/** Helper — Zod schema for a boolean-like config toggle (accepts string `"true"` from env vars). */
function boolToggle(defaultValue: boolean) {
  return z.union([z.string(), z.boolean()]).default(defaultValue).transform((arg) => {
    if (typeof arg === 'string') return arg === 'true'
    return arg
  })
}

export const ConfigSchema = z.object({
  server: z.object({
    host: z.string().default('127.0.0.1'),
    port: z.union([z.string(), z.number()]).default(8081).transform((arg, _ctx) => Number(arg)),
    domain: z.string().default('127.0.0.1:8081'),
    basePath: z.string().default('/api'),
    rateLimit: z.object({
      max: z.coerce.number().int().min(0).default(1000),
      authMax: z.coerce.number().int().min(0).default(20),
    }).default(() => ({ max: 1000, authMax: 20 })),
  }).default(() => ({
    host: '127.0.0.1',
    port: 8081,
    domain: '127.0.0.1:8081',
    basePath: '/api',
    rateLimit: { max: 1000, authMax: 20 },
  })),
  db: z.object({
    url: z.string().default(''),
    // Optional read-replica URL (e.g. CNPG's -ro service).
    // When set, pure read queries (findMany, findUnique, count) are routed here,
    // offloading the primary. Falls back to `url` when not configured.
    readUrl: z.string().default(''),
    // pg.Pool max connections per client instance per API pod.
    // Primary client (db): keep below max_connections / maxReplicas to leave
    // headroom for BetterAuth's internal pool and admin tooling.
    // Replica client (dbRo): can be higher since replicas are read-only and
    // serve no write traffic.
    pool: z.object({
      max: z.coerce.number().int().min(1).default(15),
      roMax: z.coerce.number().int().min(1).default(25),
    }).default(() => ({ max: 15, roMax: 25 })),
    prismaSchemaPath: z.string().default(path.resolve(__dirname, '../../prisma/schema.prisma')),
  }).default(() => ({
    url: '',
    readUrl: '',
    pool: { max: 15, roMax: 25 },
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
    redis: z.object({
      url: z.string().default(''),
      // Sentinel mode: comma-separated "host:port" pairs (e.g. "redis:26379,redis-2:26379").
      // When set, overrides url for connection. Takes precedence over url.
      sentinelUrls: z.string().default(''),
      // Sentinel master name. Required when sentinelUrls is set.
      sentinelMaster: z.string().min(1).default('mymaster'),
      // Redis password for standalone mode (can also be embedded in url).
      password: z.string().default(''),
      // Sentinel authentication password. When set, used as sentinelPassword.
      // Falls back to password when not set.
      sentinelPassword: z.string().default(''),
    }).default(() => ({
      url: '',
      sentinelUrls: '',
      sentinelMaster: 'mymaster',
      password: '',
      sentinelPassword: '',
    })),
    // BetterAuth internal rate limiter (separate from Fastify rate-limit).
    // Enabled by default in production. Applies per-IP limits to auth endpoints.
    rateLimit: z.object({
      enabled: boolToggle(true),
      window: z.coerce.number().int().min(1).default(10),
      max: z.coerce.number().int().min(1).default(100),
    }).default(() => ({ enabled: true, window: 10, max: 100 })),
  }).default(() => ({
    secret: 'change-me-in-production-use-256-bit-random',
    baseUrl: 'http://127.0.0.1:8081',
    trustedOrigins: ['http://localhost:3000'],
    redis: { url: '', sentinelUrls: '', sentinelMaster: 'mymaster', password: '', sentinelPassword: '' },
    rateLimit: { enabled: true, window: 10, max: 100 },
  })),
  oidc: z.object({
    enabled: boolToggle(false),
    clientId: z.string().default(''),
    clientSecret: z.string().default(''),
    issuer: z.string().default(''),
    // Public issuer URL visible from the browser (e.g. http://localhost:8084/realms/my-realm).
    // Defaults to `issuer` when not set.  Needed when the server reaches the provider
    // via an internal DNS name that differs from the public hostname.
    publicUrl: z.string().default(''),
    mapRoles: boolToggle(false),
    mapGroups: boolToggle(false),
    // Map realm_roles to org memberships (e.g. "org-admin:engineering" → member of "engineering" as admin)
    mapOrgRoles: boolToggle(false),
    orgRole: z.object({
      // Prefix for org-scoped realm roles (e.g. "org-" matches "org-admin:slug")
      prefix: z.string().default('org-'),
      // Default org role when a group doesn't specify one (e.g. "/engineering" → member)
      default: z.string().default('member'),
    }).default(() => ({ prefix: 'org-', default: 'member' })),
  }).default(() => ({
    enabled: false,
    clientId: '',
    clientSecret: '',
    issuer: '',
    publicUrl: '',
    mapRoles: false,
    mapGroups: false,
    mapOrgRoles: false,
    orgRole: { prefix: 'org-', default: 'member' },
  })),
  bootstrap: z.object({
    email: z.string().default(''),
    password: z.string().default(''),
  }).default(() => ({
    email: '',
    password: '',
  })),
  modules: z.object({
    auth: boolToggle(true),
    audit: z.object({
      enabled: boolToggle(false),
      retentionDays: z.coerce.number().int().min(0).default(0),
    }).default(() => ({ enabled: false, retentionDays: 0 })),
  }).default(() => ({
    auth: true,
    audit: { enabled: false, retentionDays: 0 },
  })),
  /**
   * Platform config overrides sourced from env vars (`PLATFORM__*`) or
   * config file (`platform` section). Fields present here are **locked** —
   * they cannot be changed via the admin UI, only via env/file.
   *
   * Uses forgiving types (string-to-bool, coerced numbers) since env vars
   * arrive as strings.
   */
  platform: z.object({
    enableRegistration: z.union([z.string(), z.boolean()]).transform(v => typeof v === 'string' ? v === 'true' : v),
    allowOrganizationCreation: z.union([z.string(), z.boolean()]).transform(v => typeof v === 'string' ? v === 'true' : v),
    appName: z.string(),
    documentationUrl: z.string(),
    maintenanceMode: z.union([z.string(), z.boolean()]).transform(v => typeof v === 'string' ? v === 'true' : v),
    maxOrganizationsPerUser: z.union([z.string(), z.number(), z.null()]).transform(v => (v === '' || v === null) ? null : Number(v)),
    maxProjectsPerOrg: z.union([z.string(), z.number(), z.null()]).transform(v => (v === '' || v === null) ? null : Number(v)),
  }).partial().optional(),
}).strict()

export type Config = z.infer<typeof ConfigSchema>

/**
 * Conservative JSON-literal coercion for env-var values.
 *
 * `JSON.parse` is only attempted when the trimmed value looks like a JSON
 * literal (object, array, boolean, null) so that arbitrary string secrets
 * such as `12345` or `[hello]` (an unquoted bracket) are returned verbatim
 * instead of being silently coerced into numbers / arrays / booleans.
 */
function coerceEnvValue(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed) return value
  const first = trimmed[0]
  const looksLikeJson
    = first === '{'
      || first === '['
      || trimmed === 'true'
      || trimmed === 'false'
      || trimmed === 'null'
  if (!looksLikeJson) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

export function parseEnv(obj: Record<string, string>): Config | Record<PropertyKey, never> {
  return Object
    .entries(obj)
    .map(([key, value]) => key
      .split('__')
      .toReversed()
      .reduce((acc, val, idx) => {
        if (!idx) {
          return { [snakeCaseToCamelCase(val)]: coerceEnvValue(value) }
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

  let rawEnv: Record<string, unknown> = {}
  let rawFile: Record<string, unknown> = {}

  try {
    rawEnv = parseEnv(getEnv(envPrefix))
    ConfigSchema.partial().parse(rawEnv)
  } catch (error) {
    const errorMessage = { description: 'invalid config environment variables', error }
    throw new Error(JSON.stringify(errorMessage))
  }

  try {
    const file = await import(fileConfigPath, { with: { type: 'json' } })
      .catch(_e => configLogger.info(`no config file detected "${fileConfigPath}"`))
    if (file) {
      rawFile = file.default
      ConfigSchema.partial().parse(rawFile)
    }
  } catch (error) {
    const errorMessage = { description: `invalid config file "${fileConfigPath}"`, error }
    throw new Error(JSON.stringify(errorMessage))
  }

  // Merge raw sources (env wins over file) then run the full schema once so
  // all transforms (e.g. trustedOrigins string → string[]) are applied to the
  // final merged value, not to individual partial pieces.
  const result = ConfigSchema.parse(deepMerge(deepMerge({}, rawFile), rawEnv)) as Config

  if (getNodeEnv() === 'production' && result.auth.secret === 'change-me-in-production-use-256-bit-random') {
    throw new Error('AUTH__SECRET must be set in production — do not use the default placeholder value')
  }

  if (getNodeEnv() !== 'production' && result.auth.secret === 'change-me-in-production-use-256-bit-random') {
    configLogger.warn('AUTH__SECRET is using the default placeholder value — JWTs are predictable')
  }

  return result
}

// eslint-disable-next-line antfu/no-top-level-await
export const config = await getConfig()

// Synchronise the shared API prefix with the resolved config value so that
// route paths (which use the `apiPrefix` getter) match the configured base path.
setApiBasePath(config.server.basePath)
