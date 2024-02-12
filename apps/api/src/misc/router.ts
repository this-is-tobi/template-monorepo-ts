import { miscContract } from '@template-monorepo-ts/shared'
import { s } from '@/app.js'
import { appVersion } from '@/utils/env.js'

export const getMiscRouter = () => s.router(miscContract, {
  getVersion: async () => {
    return {
      status: 200,
      body: {
        version: appVersion,
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
