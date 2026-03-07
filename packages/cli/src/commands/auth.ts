import type { CommandDef } from 'citty'
import type { GlobalArgs } from '../types.js'
import { ApiError } from '@template-monorepo-ts/shared'
import { defineCommand } from 'citty'
import { globalArgs } from '../args.js'
import { createClient } from '../client.js'
import { loadConfig, resolveConfig, saveConfig } from '../config.js'
import { printOutput } from '../formatter.js'

interface LoginArgs extends GlobalArgs {
  email?: string
  password?: string
}

/**
 * Run the `auth login` command.
 * Authenticates via email/password and stores the bearer token.
 * If --key is provided, stores the API key instead.
 */
export async function runLogin(args: LoginArgs): Promise<void> {
  // API key login: just store the key
  if (args.key) {
    const current = await loadConfig()
    await saveConfig({ ...current, apiKey: args.key })
    process.stdout.write('API key saved to config.\n')
    return
  }

  // Email/password login via BetterAuth
  if (!args.email || !args.password) {
    throw new Error(
      'Provide --email and --password for interactive login,\n'
      + 'or --key to store an API key.',
    )
  }

  const config = await resolveConfig({ ...args, server: args.server })
  const client = createClient(config)

  try {
    const { data } = await client.auth.signIn({ email: args.email, password: args.password })
    if (!data.token) {
      throw new Error('Login succeeded but no bearer token was returned. Is the bearer plugin enabled?')
    }

    const current = await loadConfig()
    await saveConfig({ ...current, token: data.token, serverUrl: config.serverUrl })
    process.stdout.write('Logged in successfully. Token saved to config.\n')
  } catch (error) {
    if (error instanceof ApiError) {
      const message = (error.data as Record<string, unknown>)?.message ?? error.statusText
      throw new Error(`Login failed: ${message}`)
    }
    throw error
  }
}

/**
 * Run the `auth logout` command.
 * Clears stored credentials from config.
 */
export async function runLogout(): Promise<void> {
  const current = await loadConfig()
  const { token: _t, apiKey: _k, ...rest } = current
  await saveConfig(rest)
  process.stdout.write('Logged out. Credentials removed from config.\n')
}

/**
 * Run the `auth whoami` command.
 * Shows the current authenticated user session.
 */
export async function runWhoami(args: GlobalArgs): Promise<void> {
  const config = await resolveConfig(args)
  const client = createClient(config)

  try {
    const { data } = await client.auth.getSession()
    printOutput(data, config.output)
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error('Not authenticated. Run `tmts auth login` first.')
    }
    throw error
  }
}

const authCommand: CommandDef = defineCommand({
  meta: {
    name: 'auth',
    description: 'Authenticate with the API server',
  },
  subCommands: {
    login: defineCommand({
      meta: { description: 'Login with email/password or store an API key' },
      args: {
        ...globalArgs,
        email: { type: 'string', description: 'Account email' },
        password: { type: 'string', description: 'Account password' },
      },
      run: ({ args }) => runLogin(args as unknown as LoginArgs),
    }),
    logout: defineCommand({
      meta: { description: 'Clear stored credentials' },
      run: () => runLogout(),
    }),
    whoami: defineCommand({
      meta: { description: 'Show current authenticated user' },
      args: { ...globalArgs },
      run: ({ args }) => runWhoami(args as unknown as GlobalArgs),
    }),
  },
})

export default authCommand
