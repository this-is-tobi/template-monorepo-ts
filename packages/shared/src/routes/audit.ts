import type { RouteDefinition } from '../api-client/types.js'
import { apiPrefix } from '../api-client/utils.js'
import { GetAuditLogsSchema } from '../schemas/index.js'

/**
 * Audit log API route definitions
 */
export const auditRoutes = {
  getAuditLogs: {
    method: 'GET',
    get path() { return `${apiPrefix.v1}/audit` },
    summary: 'Query audit logs',
    description: 'Retrieve paginated audit log entries with optional filters. Requires audit:read permission (admin only).',
    tags: ['Audit'],
    query: GetAuditLogsSchema.query,
    responses: GetAuditLogsSchema.responses,
  },
} as const satisfies Record<string, RouteDefinition>
