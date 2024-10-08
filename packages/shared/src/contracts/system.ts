import { apiPrefix, contractInstance } from '~/api-client.js'
import { GetHealthzSchema, GetVersionSchema } from '~/schemas/index.js'

export const systemContract = contractInstance.router({
  getVersion: {
    method: 'GET',
    path: `${apiPrefix.v1}/version`,
    summary: 'Get version',
    description: 'Retrieve api version.',
    responses: GetVersionSchema.responses,
  },

  getHealth: {
    method: 'GET',
    path: `${apiPrefix.v1}/healthz`,
    summary: 'Get health',
    description: 'Retrieve api health infos.',
    responses: GetHealthzSchema.responses,
  },
})
