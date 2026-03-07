import type { CommandDef } from 'citty'
import type { GlobalArgs } from '../types.js'
import { defineCommand } from 'citty'
import { globalArgs } from '../args.js'
import { createClient } from '../client.js'
import { resolveConfig } from '../config.js'
import { printOutput } from '../formatter.js'

/**
 * Run the `system version` command.
 */
export async function runVersion(args: GlobalArgs): Promise<void> {
  const config = await resolveConfig(args)
  const client = createClient(config)
  const { data } = await client.system.getVersion()
  printOutput(data, config.output)
}

/**
 * Run the `system health` command.
 */
export async function runHealth(args: GlobalArgs): Promise<void> {
  const config = await resolveConfig(args)
  const client = createClient(config)
  const { data } = await client.system.getHealth()
  printOutput(data, config.output)
}

/**
 * Run the `system ready` command.
 */
export async function runReady(args: GlobalArgs): Promise<void> {
  const config = await resolveConfig(args)
  const client = createClient(config)
  const { data } = await client.system.getReady()
  printOutput(data, config.output)
}

/**
 * Run the `system live` command.
 */
export async function runLive(args: GlobalArgs): Promise<void> {
  const config = await resolveConfig(args)
  const client = createClient(config)
  const { data } = await client.system.getLive()
  printOutput(data, config.output)
}

const systemCommand: CommandDef = defineCommand({
  meta: {
    name: 'system',
    description: 'System health and version commands',
  },
  subCommands: {
    version: defineCommand({
      meta: { description: 'Show API server version' },
      args: { ...globalArgs },
      run: ({ args }) => runVersion(args as unknown as GlobalArgs),
    }),
    health: defineCommand({
      meta: { description: 'Check API server health' },
      args: { ...globalArgs },
      run: ({ args }) => runHealth(args as unknown as GlobalArgs),
    }),
    ready: defineCommand({
      meta: { description: 'Check API server readiness' },
      args: { ...globalArgs },
      run: ({ args }) => runReady(args as unknown as GlobalArgs),
    }),
    live: defineCommand({
      meta: { description: 'Check API server liveness' },
      args: { ...globalArgs },
      run: ({ args }) => runLive(args as unknown as GlobalArgs),
    }),
  },
})

export default systemCommand
