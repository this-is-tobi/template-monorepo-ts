import type { ApiClient } from '@template-monorepo-ts/shared'

/**
 * Supported output formats for CLI responses
 */
export type OutputFormat = 'table' | 'json'

/**
 * Persisted CLI configuration stored in ~/.config/tmts/config.json
 */
export interface CliConfig {
  serverUrl?: string
  token?: string
  apiKey?: string
  output?: OutputFormat
}

/**
 * Fully resolved configuration (after merging CLI args > env > file > defaults)
 */
export interface ResolvedConfig {
  serverUrl: string
  token?: string
  apiKey?: string
  output: OutputFormat
}

/**
 * Raw CLI args passed by citty (before resolution)
 */
export interface GlobalArgs {
  server?: string
  token?: string
  key?: string
  output?: string
}

/**
 * Context passed to command run functions
 */
export interface CommandContext {
  client: ApiClient
  config: ResolvedConfig
}
