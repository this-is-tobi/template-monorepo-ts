/**
 * Global CLI args shared across all leaf commands.
 * Each leaf command spreads these into its `args` definition.
 */
export const globalArgs = {
  server: {
    type: 'string' as const,
    description: 'API server URL (env: TMTS_SERVER_URL)',
  },
  token: {
    type: 'string' as const,
    description: 'Bearer token for authentication (env: TMTS_TOKEN)',
  },
  key: {
    type: 'string' as const,
    description: 'API key for authentication (env: TMTS_API_KEY)',
  },
  output: {
    type: 'string' as const,
    description: 'Output format: table, json (default: table)',
  },
} as const
