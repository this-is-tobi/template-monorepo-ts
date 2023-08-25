import type { FastifySchema, FastifyRequest, FastifyReply, FastifyInstance, FastifyServerOptions } from 'fastify'
import { sendOk } from './responses.js'
import { appVersion } from './env.js'

export const apiPrefix: string = '/api/v1'

export const miscRouter = async (app: FastifyInstance, _opts: FastifyServerOptions) => {
  app.get('/version', { schema: versionSchema }, getVersion)
  app.get('/healthz', { schema: healthSchema }, getHealth)
}

const getVersion = async (_req: FastifyRequest, res: FastifyReply) => {
  sendOk(res, { version: appVersion })
}

const getHealth = async (_req: FastifyRequest, res: FastifyReply) => {
  sendOk(res, { status: 'OK' })
}

const versionSchema: FastifySchema = {
  description: 'Retrieve server version.',
  tags: ['System'],
  consumes: ['application/json'],
  produces: ['application/json'],
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        version: { type: 'string', value: '1.0.0' },
      },
    },
    500: {
      description: 'Error response',
      type: 'object',
      properties: {
        status: { type: 'number', value: 500 },
        error: { type: 'string', value: 'an unexpected error occured' },
      },
    },
  },
}

const healthSchema: FastifySchema = {
  description: 'Retrieve api version.',
  tags: ['System'],
  consumes: ['application/json'],
  produces: ['application/json'],
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: { type: 'string', value: 'OK' },
      },
    },
    500: {
      description: 'Error response',
      type: 'object',
      properties: {
        status: { type: 'number', value: 500 },
        error: { type: 'string', value: 'an unexpected error occured' },
      },
    },
  },
}
