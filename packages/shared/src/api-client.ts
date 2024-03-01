import { initClient, initContract } from '@ts-rest/core'

export const contractInstance: ReturnType<typeof initContract> = initContract()

export const apiPrefix: string = '/api/v1'

export const getContract = async () => contractInstance.router({
  Users: (await import('./contracts/index.js')).userContract,
  System: (await import('./contracts/index.js')).miscContract,
},
{
  validateResponseOnClient: true,
})

export const getApiClient = async (baseUrl: string, baseHeaders: Record<string, string>) => initClient(await getContract(), {
  baseUrl,
  baseHeaders,
})
