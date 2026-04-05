import type { RouteDefinition } from '../api-client/types.js'
import { apiPrefix } from '../api-client/utils.js'
import { GetAuditLogsSchema, GetOrgAuditLogsSchema } from '../schemas/index.js'

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

  getOrgAuditLogs: {
    method: 'GET',
    get path() { return `${apiPrefix.v1}/organizations/:organizationId/audit` },
    summary: 'Query organization audit logs',
    description: 'Retrieve paginated audit log entries scoped to a specific organization. Requires audit:read permission within the organization (owner or admin role).',
    tags: ['Audit'],
    params: GetOrgAuditLogsSchema.params,
    query: GetOrgAuditLogsSchema.query,
    responses: GetOrgAuditLogsSchema.responses,
  },
} as const satisfies Record<string, RouteDefinition>
