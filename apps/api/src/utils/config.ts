import type { RuntimeConfigEntry } from '@template-monorepo-ts/shared'
import path from 'node:path'
import { createLogger } from '@template-monorepo-ts/logger'
import { camelCaseToSnakeCase, deepMerge, setApiBasePath, snakeCaseToCamelCase } from '@template-monorepo-ts/shared'
import { z } from 'zod'
// JSON import resolved at bundle time — the version string is inlined into the
// bundle by Bun, so no file-system access is needed at runtime in production.
import pkg from '../../package.json' with { type: 'json' }
import { getNodeEnv } from './functions.js'
import { describeOtelEntries } from './otel-env.js'

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
    /**
     * Trust `X-Forwarded-For` when the API sits behind a reverse proxy.
     *
     * Left `false`, `request.ip` is the socket peer — which behind an ingress
     * is the proxy itself. The per-IP rate limiter then collapses into a
     * single bucket shared by every client, and the audit log records the
     * proxy as the origin of every sign-in.
     *
     * Accepts `true`, a hop count, or a comma-separated list of trusted
     * addresses / CIDRs (`loopback`, `linklocal` and `uniquelocal` also work).
     * Prefer one of the latter two: a bare `true` lets any client forge its
     * own address in `X-Forwarded-For`, poisoning the very two things this
     * setting exists to fix.
     */
    trustProxy: z.union([z.string(), z.boolean(), z.number()]).default(false).transform((arg) => {
      if (typeof arg !== 'string') return arg
      const trimmed = arg.trim()
      if (trimmed === '' || trimmed === 'false') return false
      if (trimmed === 'true') return true
      const hops = Number(trimmed)
      return Number.isInteger(hops) && hops >= 0 ? hops : trimmed
    }),
  }).default(() => ({
    host: '127.0.0.1',
    port: 8081,
    domain: '127.0.0.1:8081',
    basePath: '/api',
    rateLimit: { max: 1000, authMax: 20 },
    trustProxy: false,
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
    // Whether to register the module at all — a boot-time decision, unlike the
    // retention window, which is runtime policy and lives in `AppConfig`
    // (overridable here as `platform.auditRetentionDays`).
    audit: z.object({
      enabled: boolToggle(false),
    }).default(() => ({ enabled: false })),
  }).default(() => ({
    auth: true,
    audit: { enabled: false },
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
    auditRetentionDays: z.coerce.number().int().min(0),
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

/** Peel wrapper schemas (default, optional, transforms) down to the core type. */
function unwrapSchema(schema: unknown): unknown {
  let current = schema
  for (let i = 0; i < 8; i++) {
    const def = (current as { _def?: Record<string, unknown> })?._def
    // default / optional / nullable → innerType; pipe (transform) → in; effects → schema
    const inner = def && (def.innerType ?? def.in ?? def.schema)
    if (!inner) break
    current = inner
  }
  return current
}

/** A single configurable option — one leaf of `ConfigSchema`. */
export interface ConfigLeaf {
  /** Dot path into the resolved config object (e.g. `server.rateLimit.max`). */
  path: string
  /** Env var that sets it (e.g. `SERVER__RATE_LIMIT__MAX`). */
  envVar: string
}

/**
 * Every option `ConfigSchema` can consume, as both a config path and the env
 * var spelling of that path (camelCase segments converted back to SNAKE_CASE,
 * joined with `__` — the inverse of what `parseEnv` does).
 */
export function collectConfigLeaves(schema: unknown = ConfigSchema, prefix: string[] = []): ConfigLeaf[] {
  const core = unwrapSchema(schema) as { shape?: Record<string, unknown> }
  if (!core?.shape) {
    if (!prefix.length) return []
    return [{ path: prefix.join('.'), envVar: prefix.map(camelCaseToSnakeCase).join('__') }]
  }
  return Object.entries(core.shape)
    .flatMap(([key, child]) => collectConfigLeaves(child, [...prefix, key]))
}

/** Every env var name `ConfigSchema` can consume. */
export function collectEnvVarNames(): string[] {
  return collectConfigLeaves().map(leaf => leaf.envVar)
}

/**
 * Flag env vars that match a known prefix but no config option — otherwise a
 * renamed or misspelled var (e.g. `AUTH__REDIS_URL` instead of
 * `AUTH__REDIS__URL`) is silently ignored and the feature it configures
 * "mysteriously" stays off.  Nesting mistakes get a did-you-mean hint since
 * `__` placement is the most common error.
 */
export function warnUnknownEnvVars(envKeys: string[], knownNames: string[] = collectEnvVarNames()): string[] {
  const known = new Set(knownNames)
  // Same letters, different underscore layout → almost certainly a nesting typo.
  const byLetters = new Map(knownNames.map(name => [name.replaceAll('_', ''), name]))
  const warnings: string[] = []
  for (const key of envKeys) {
    if (known.has(key)) continue
    const suggestion = byLetters.get(key.replaceAll('_', ''))
    warnings.push(suggestion
      ? `Ignoring unknown env var "${key}" — did you mean "${suggestion}"?`
      : `Ignoring unknown env var "${key}" — not a recognized config option (see .env-example for supported names)`)
  }
  for (const warning of warnings) configLogger.warn(warning)
  return warnings
}

/**
 * Turn a ZodError into an actionable message: one line per issue with the
 * config path, what went wrong, and the env var spelling of that path (plus
 * the nested option names when an object was expected).
 */
function formatConfigError(error: unknown, description: string): Error {
  if (error instanceof z.ZodError) {
    const knownNames = collectEnvVarNames()
    const lines = error.issues.map((issue) => {
      const path = issue.path.join('.') || '(root)'
      const envName = issue.path.map(segment => camelCaseToSnakeCase(String(segment))).join('__')
      const nested = knownNames.filter(name => name.startsWith(`${envName}__`))
      const hint = issue.message.includes('expected object') && nested.length
        ? ` — this option is an object, use nested keys: ${nested.join(', ')}`
        : ''
      return `  - ${path}: ${issue.message} (env var: ${envName})${hint}`
    })
    return new Error(`${description}:\n${lines.join('\n')}`)
  }
  return new Error(JSON.stringify({ description, error }))
}

/** The raw env and file layers behind a resolved config, before merging. */
export interface RawConfigLayers {
  rawEnv: Record<string, unknown>
  rawFile: Record<string, unknown>
}

/**
 * Layers that produced the exported `config`.
 *
 * Recorded once at boot so that config introspection reports a value and its
 * source as one consistent pair. Re-reading `process.env` at request time
 * would be both slower and subtly wrong — the env can be mutated after boot,
 * which would attribute a value to a layer that never supplied it.
 */
let bootLayers: RawConfigLayers = { rawEnv: {}, rawFile: {} }

/**
 * Read the two raw config layers without merging or applying defaults.
 *
 * Emits no warnings: the caller decides whether this read is the
 * authoritative boot one.
 */
async function readRawLayers(fileConfigPath: string, envPrefix: string | string[]): Promise<RawConfigLayers & {
  envKeys: string[]
}> {
  let rawEnv: Record<string, unknown> = {}
  let rawFile: Record<string, unknown> = {}
  let envKeys: string[] = []

  try {
    const envVars = getEnv(envPrefix)
    envKeys = Object.keys(envVars)
    rawEnv = parseEnv(envVars)
    ConfigSchema.partial().parse(rawEnv)
  } catch (error) {
    throw formatConfigError(error, 'invalid config environment variables')
  }

  try {
    const file = await import(fileConfigPath, { with: { type: 'json' } })
      .catch(_e => configLogger.info(`no config file detected "${fileConfigPath}"`))
    if (file) {
      rawFile = file.default
      ConfigSchema.partial().parse(rawFile)
    }
  } catch (error) {
    throw formatConfigError(error, `invalid config file "${fileConfigPath}"`)
  }

  return { rawEnv, rawFile, envKeys }
}

export async function getConfig(opts?: { fileConfigPath?: string, envPrefix?: string | string[] }) {
  const fileConfigPath = opts?.fileConfigPath ?? CONFIG_PATH
  const envPrefix = opts?.envPrefix ?? ENV_PREFIX

  const { rawEnv, rawFile, envKeys } = await readRawLayers(fileConfigPath, envPrefix)
  warnUnknownEnvVars(envKeys)

  // Merge raw sources (env wins over file) then run the full schema once so
  // all transforms (e.g. trustedOrigins string → string[]) are applied to the
  // final merged value, not to individual partial pieces.
  const result = ConfigSchema.parse(deepMerge(deepMerge({}, rawFile), rawEnv)) as Config

  // Keep the layers that produced this result, for `describeRuntimeConfig`.
  bootLayers = { rawEnv, rawFile }

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

// ---------------------------------------------------------------------------
// Runtime config introspection
//
// Answers "did my env var actually land?" from the admin UI instead of a shell
// on the container. Read-only by construction: this tier is resolved once at
// boot, so nothing here is editable at runtime.
// ---------------------------------------------------------------------------

/**
 * Leaves whose value must never leave the server, matched on the last path
 * segment so options added later are covered by default rather than by
 * remembering to update a list.
 */
const SECRET_SEGMENT_PATTERN = /secret|password|credential|token/i

/**
 * Leaves that are not *named* like secrets but embed credentials anyway —
 * connection strings of the form `scheme://user:password@host`.
 */
const SECRET_PATHS = new Set([
  'db.url',
  'db.readUrl',
  'auth.redis.url',
  'auth.redis.sentinelUrls',
])

/** Whether a config path holds a value that must never be sent to a client. */
export function isSecretConfigPath(path: string): boolean {
  if (SECRET_PATHS.has(path)) return true
  const segment = path.split('.').at(-1) ?? ''
  return SECRET_SEGMENT_PATTERN.test(segment)
}

/** Collect the dot paths of every leaf actually present in a raw config layer. */
function collectPresentPaths(value: unknown, prefix: string[] = [], out = new Set<string>()): Set<string> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      collectPresentPaths(child, [...prefix, key], out)
    }
  } else if (prefix.length) {
    out.add(prefix.join('.'))
  }
  return out
}

/** Read a dot path out of the resolved config object. */
function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (acc, key) => (acc !== null && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined),
    source,
  )
}

/** Render a resolved config value for display. */
function stringifyConfigValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

/**
 * Describe every config option of a resolved config: its effective value and
 * which layer supplied it.
 *
 * Pure — takes the config and the layers that produced it, so a value and its
 * attributed source can never disagree.
 *
 * Secret values are replaced with `null` (the caller still learns whether one
 * is configured via `isSet`), so the result is safe to hand to a platform
 * admin without leaking credentials.
 *
 * `platform.*` entries appear only when an operator actually pinned them —
 * unset ones are not "defaults", they simply defer to the database-backed
 * `AppConfig`, and listing them would misreport that.
 */
export function describeConfigEntries(resolved: Config, layers: RawConfigLayers): RuntimeConfigEntry[] {
  const envPaths = collectPresentPaths(layers.rawEnv)
  const filePaths = collectPresentPaths(layers.rawFile)

  return collectConfigLeaves().flatMap(({ path, envVar }) => {
    const source = envPaths.has(path) ? 'env' : filePaths.has(path) ? 'file' : 'default'
    if (path.startsWith('platform.') && source === 'default') return []

    const secret = isSecretConfigPath(path)
    const value = stringifyConfigValue(readPath(resolved, path))

    return [{
      path,
      envVar,
      value: secret ? null : value,
      source,
      secret,
      isSet: value !== '',
    }]
  })
}

/**
 * Describe the configuration this server actually booted with.
 *
 * Telemetry is appended even though it lives outside `ConfigSchema`: it is
 * configured with SDK-standard `OTEL_*` names rather than the `__` prefixes
 * (see `otel-env.ts` for why), but an operator asking "why is there no trace
 * data?" looks in exactly the same place as one asking "did my env var land?".
 */
export function describeRuntimeConfig(): RuntimeConfigEntry[] {
  return [...describeConfigEntries(config, bootLayers), ...describeOtelEntries()]
}
