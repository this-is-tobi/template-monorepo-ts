import { apiPrefix, c } from '@/api-client.js'
import { GetHealthzSchema, GetVersionSchema } from '@/schemas/index.js'

export const miscContract = c.router({
  getVersion: {
    method: 'GET',
    path: apiPrefix + '/version',
    summary: 'Get version',
    description: 'Retrieve api version.',
    responses: {
      200: GetVersionSchema.responses['200'],
      500: GetVersionSchema.responses['500'],
    },
  },

  getHealth: {
    method: 'GET',
    path: apiPrefix + '/healthz',
    summary: 'Get health',
    description: 'Retrieve api health infos.',
    responses: {
      200: GetHealthzSchema.responses['200'],
      500: GetHealthzSchema.responses['500'],
    },
  },
})
