import { initClient, initContract } from '@ts-rest/core'

/**
 * Contract instance for defining API endpoints
 * Used as the base for all API contracts
 */
export const contractInstance: ReturnType<typeof initContract> = initContract()

/**
 * API versioning prefixes
 * Used to prefix all API routes with the appropriate version
 */
export const apiPrefix = {
  v1: '/api/v1',
}

/**
 * Gets the combined API contract with all endpoints
 * Lazily imports individual contracts to improve initial load time
 *
 * @returns The combined API contract
 */
export async function getContract() {
  return contractInstance.router({
    Users: (await import('./contracts/index.js')).userContract,
    System: (await import('./contracts/index.js')).systemContract,
  }, {
    validateResponseOnClient: true,
  })
}

/**
 * Creates an initialized API client for making requests
 *
 * @param baseUrl - The base URL for all API requests
 * @param baseHeaders - Default headers to include with all requests
 * @returns An initialized API client
 */
export async function getApiClient(baseUrl: string, baseHeaders: Record<string, string>) {
  return initClient(await getContract(), {
    baseUrl,
    baseHeaders,
  })
}
