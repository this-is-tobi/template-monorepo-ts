/**
 * Centralised response messages for the users resource.
 * Used by both the router (HTTP responses) and the business layer (logging).
 */
export const userMessages = {
  created: 'user successfully created',
  retrieved: 'user successfully retrieved',
  retrievedAll: 'users successfully retrieved',
  updated: 'user successfully updated',
  deleted: 'user successfully deleted',
  notFound: 'user not found',
  notFoundUpdate: 'user not found for update',
  notFoundDeletion: 'user not found for deletion',
} as const
