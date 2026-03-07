import type { CommandDef } from 'citty'
import type { CliConfig } from '../types.js'
import { defineCommand } from 'citty'
import { deleteConfigKey, getConfigPath, loadConfig, updateConfig } from '../config.js'

type ConfigKey = keyof CliConfig

const VALID_KEYS = new Set<ConfigKey>(['serverUrl', 'token', 'apiKey', 'output'])

/**
 * Run the `config set` command.
 */
export async function runConfigSet(key: string, value: string): Promise<void> {
  if (!VALID_KEYS.has(key as ConfigKey)) {
    throw new Error(`Unknown config key: ${key}. Valid keys: ${[...VALID_KEYS].join(', ')}`)
  }
  await updateConfig({ [key]: value })
  process.stdout.write(`Set ${key} = ${value}\n`)
}

/**
 * Run the `config get` command.
 */
export async function runConfigGet(key: string): Promise<void> {
  if (!VALID_KEYS.has(key as ConfigKey)) {
    throw new Error(`Unknown config key: ${key}. Valid keys: ${[...VALID_KEYS].join(', ')}`)
  }
  const config = await loadConfig()
  const value = config[key as ConfigKey]
  process.stdout.write(`${value ?? ''}\n`)
}

/**
 * Run the `config list` command.
 */
export async function runConfigList(): Promise<void> {
  const config = await loadConfig()
  const path = getConfigPath()
  process.stdout.write(`Config file: ${path}\n\n`)
  const entries = Object.entries(config)
  if (entries.length === 0) {
    process.stdout.write('(empty)\n')
    return
  }
  for (const [key, value] of entries) {
    const display = key === 'token' || key === 'apiKey'
      ? `${String(value).slice(0, 8)}...`
      : String(value)
    process.stdout.write(`${key} = ${display}\n`)
  }
}

/**
 * Run the `config delete` command.
 */
export async function runConfigDelete(key: string): Promise<void> {
  if (!VALID_KEYS.has(key as ConfigKey)) {
    throw new Error(`Unknown config key: ${key}. Valid keys: ${[...VALID_KEYS].join(', ')}`)
  }
  await deleteConfigKey(key as ConfigKey)
  process.stdout.write(`Deleted ${key}\n`)
}

const configCommand: CommandDef = defineCommand({
  meta: {
    name: 'config',
    description: 'Manage CLI configuration',
  },
  subCommands: {
    set: defineCommand({
      meta: { description: 'Set a config value' },
      args: {
        key: { type: 'positional', description: 'Config key (serverUrl, token, apiKey, output)', required: true },
        value: { type: 'positional', description: 'Config value', required: true },
      },
      run: ({ args }) => runConfigSet(String(args.key), String(args.value)),
    }),
    get: defineCommand({
      meta: { description: 'Get a config value' },
      args: {
        key: { type: 'positional', description: 'Config key', required: true },
      },
      run: ({ args }) => runConfigGet(String(args.key)),
    }),
    list: defineCommand({
      meta: { description: 'List all config values' },
      run: () => runConfigList(),
    }),
    delete: defineCommand({
      meta: { description: 'Delete a config key' },
      args: {
        key: { type: 'positional', description: 'Config key', required: true },
      },
      run: ({ args }) => runConfigDelete(String(args.key)),
    }),
  },
})

export default configCommand
