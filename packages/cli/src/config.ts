import type { CliConfig, GlobalArgs, OutputFormat, ResolvedConfig } from './types.js'
import { join } from 'node:path'
import { readJsonFile, writeJsonFile } from './fs.js'

/**
 * Returns the config directory path (~/.config/tmts)
 */
export function getConfigDir(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? ''
  return join(home, '.config', 'tmts')
}

/**
 * Returns the config file path (~/.config/tmts/config.json)
 */
export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json')
}

/**
 * Load CLI config from disk. Returns empty config if file doesn't exist or is invalid.
 */
export async function loadConfig(): Promise<CliConfig> {
  const configPath = getConfigPath()
  const data = await readJsonFile<unknown>(configPath)
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {}
  }
  return data as CliConfig
}

/**
 * Save CLI config to disk. Creates the config directory if needed.
 */
export async function saveConfig(config: CliConfig): Promise<void> {
  await writeJsonFile(getConfigPath(), config)
}

/**
 * Update specific fields in the saved config (merge, not replace).
 */
export async function updateConfig(updates: Partial<CliConfig>): Promise<CliConfig> {
  const current = await loadConfig()
  const merged = { ...current, ...updates }
  await saveConfig(merged)
  return merged
}

/**
 * Delete a key from the saved config.
 */
export async function deleteConfigKey(key: keyof CliConfig): Promise<CliConfig> {
  const current = await loadConfig()
  const { [key]: _, ...rest } = current
  await saveConfig(rest)
  return rest
}

const VALID_OUTPUTS = new Set<OutputFormat>(['table', 'json'])

/**
 * Parse and validate an output format string.
 */
function parseOutputFormat(value: string | undefined): OutputFormat | undefined {
  if (!value) return undefined
  if (VALID_OUTPUTS.has(value as OutputFormat)) return value as OutputFormat
  return undefined
}

/**
 * Resolve final configuration by merging sources (CLI args > env vars > config file > defaults).
 * Throws if no server URL is found from any source.
 */
export async function resolveConfig(args: GlobalArgs): Promise<ResolvedConfig> {
  const fileConfig = await loadConfig()

  const serverUrl
    = args.server
      || process.env.TMTS_SERVER_URL
      || fileConfig.serverUrl

  const token
    = args.token
      || process.env.TMTS_TOKEN
      || fileConfig.token

  const apiKey
    = args.key
      || process.env.TMTS_API_KEY
      || fileConfig.apiKey

  const output
    = parseOutputFormat(args.output)
      || parseOutputFormat(process.env.TMTS_OUTPUT)
      || fileConfig.output
      || 'table'

  if (!serverUrl) {
    throw new Error(
      'No server URL configured. Set it via:\n'
      + '  Flag:    tmts --server http://your-api.com <command>\n'
      + '  Env:     TMTS_SERVER_URL=http://your-api.com\n'
      + '  Config:  tmts config set serverUrl http://your-api.com',
    )
  }

  return { serverUrl, token, apiKey, output }
}
