/**
 * Global CLI args shared across all leaf commands.
 * Each leaf command spreads these into its `args` definition.
 *
 * A credential passed as a flag lands in the process argument vector, which
 * every other user on the host can read for as long as the command runs, and
 * in the shell history file, which outlives the session entirely. Each one
 * below therefore names its environment variable, and that is the form to
 * reach for — the flags stay for the cases where nothing else fits.
 */
export const globalArgs = {
  server: {
    type: 'string' as const,
    description: 'API server URL (env: TMTS_SERVER_URL)',
  },
  token: {
    type: 'string' as const,
    description: 'Bearer token — prefer TMTS_TOKEN; a flag is visible in `ps` and shell history',
  },
  key: {
    type: 'string' as const,
    description: 'API key — prefer TMTS_API_KEY; a flag is visible in `ps` and shell history',
  },
  output: {
    type: 'string' as const,
    description: 'Output format: table, json (default: table)',
  },
} as const
