import { miscContract } from '@template-monorepo-ts/shared'
import { s } from '@/app.js'
import { apiVersion } from '@/utils/env.js'

export const getMiscRouter = () => s.router(miscContract, {
  getVersion: async () => {
    return {
      status: 200,
      body: {
        version: apiVersion,
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
