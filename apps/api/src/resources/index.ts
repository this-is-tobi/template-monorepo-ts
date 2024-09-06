import type { FastifyInstance } from 'fastify'
import { serverInstance } from '~/app.js'
import { getSystemRouter } from './system/index.js'
import { getUserRouter } from './users/index.js'

export function getApiRouter() {
  return async (app: FastifyInstance) => {
    await app.register(serverInstance.plugin(getSystemRouter()))
    await app.register(serverInstance.plugin(getUserRouter()))
  }
}
