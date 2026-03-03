/**
 * Centralised response messages for the projects resource.
 * Used by both the router (HTTP responses) and the business layer (logging).
 */
export const projectMessages = {
  created: 'project successfully created',
  retrieved: 'project successfully retrieved',
  retrievedAll: 'projects successfully retrieved',
  updated: 'project successfully updated',
  deleted: 'project successfully deleted',
  notFound: 'project not found',
  notFoundUpdate: 'project not found for update',
  notFoundDeletion: 'project not found for deletion',
  forbidden: 'access to project is forbidden',
} as const
