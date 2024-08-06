import { systemContract } from '@template-monorepo-ts/shared'
import { serverInstance } from '@/app.js'
import { config } from '@/utils/index.js'

export function getSystemRouter() {
  return serverInstance.router(systemContract, {
    getVersion: async () => {
      return {
        status: 200,
        body: {
          version: config.api.version,
        },
      }
    },

    getHealth: async () => {
      return {
        status: 200,
        body: {
          status: 'OK',
        },
      }
    },
  })
}
