import type { FastifySchema } from 'fastify'

export const createSchema: FastifySchema = {
  description: 'Create new resource.',
  tags: ['Examples'],
  consumes: ['application/json'],
  produces: ['application/json'],
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', description: 'Resource name' },
    },
  },
  response: {
    201: {
      description: 'Success',
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: { type: 'object' },
      },
    },
    400: {
      description: 'Bad request',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    403: {
      description: 'Forbidden',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    500: {
      description: 'Internal server error',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  },
}

export const readAllSchema: FastifySchema = {
  description: 'Get all resources.',
  tags: ['Examples'],
  consumes: ['application/json'],
  produces: ['application/json'],
  response: {
    200: {
      description: 'Success',
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: { type: 'array' },
      },
    },
    400: {
      description: 'Bad request',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    403: {
      description: 'Forbidden',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    500: {
      description: 'Internal server error',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  },
}

export const readSchema: FastifySchema = {
  description: 'Get resource by its ID.',
  tags: ['Examples'],
  consumes: ['application/json'],
  produces: ['application/json'],
  response: {
    200: {
      description: 'Success',
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: { type: 'object' },
      },
    },
    400: {
      description: 'Bad request',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    403: {
      description: 'Forbidden',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    500: {
      description: 'Internal server error',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  },
}

export const updateSchema: FastifySchema = {
  description: 'Update resource by its ID.',
  tags: ['Examples'],
  consumes: ['application/json'],
  produces: ['application/json'],
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', description: 'Resource name' },
    },
  },
  response: {
    200: {
      description: 'Success',
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: { type: 'object' },
      },
    },
    400: {
      description: 'Bad request',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    403: {
      description: 'Forbidden',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    500: {
      description: 'Internal server error',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  },
}

export const deleteSchema: FastifySchema = {
  description: 'Delete resource by its ID.',
  tags: ['Examples'],
  consumes: ['application/json'],
  produces: ['application/json'],
  response: {
    200: {
      description: 'Success',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    400: {
      description: 'Bad request',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    403: {
      description: 'Forbidden',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    500: {
      description: 'Internal server error',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  },
}
