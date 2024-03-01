import type { FastifyInstance } from 'fastify'
import { serverInstance } from '@/app.js'
import { getMiscRouter } from './system/index.js'
import { getUserRouter } from './users/index.js'

export const getApiRouter = () => async (app: FastifyInstance) => {
  await app.register(serverInstance.plugin(getMiscRouter()))
  await app.register(serverInstance.plugin(getUserRouter()))
}
