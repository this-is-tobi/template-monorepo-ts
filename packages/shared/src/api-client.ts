import { initClient, initContract } from '@ts-rest/core'

export const contractInstance: ReturnType<typeof initContract> = initContract()

export const apiPrefix = {
  v1: '/api/v1',
}

export async function getContract() {
  return contractInstance.router({
    Users: (await import('./contracts/index.js')).userContract,
    System: (await import('./contracts/index.js')).systemContract,
  }, {
    validateResponseOnClient: true,
  })
}

export async function getApiClient(baseUrl: string, baseHeaders: Record<string, string>) {
  return initClient(await getContract(), {
    baseUrl,
    baseHeaders,
  })
}
