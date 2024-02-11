import { s } from '@/app.js'
import { miscContract } from './contracts.ts'
import { appVersion } from '@/utils/env.ts'

export const apiPrefix: string = '/api/v1'

export const miscRouter = s.router(miscContract, {
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
