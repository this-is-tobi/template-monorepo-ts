import { miscContract } from '@template-monorepo-ts/shared'
import { s } from '@/app.js'
import { config } from '@/utils/index.js'

export const getMiscRouter = () => s.router(miscContract, {
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
