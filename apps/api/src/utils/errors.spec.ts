import { describe, it, expect } from 'vitest'
import { EnhanceError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, TooManyRequestError, ServerError } from './errors.js'

describe('Utils - errors', () => {
  it('Should create a custom enhance error', async () => {
    const message = 'this is an error'
    const data = {
      description: 'this is the error description',
      extras: {
        someKey: 'some value',
      },
    }
    const error = new EnhanceError(message, data)

    expect(error).toHaveProperty('description', data.description)
    expect(error).toHaveProperty('extras', data.extras)
    expect(error).toHaveProperty('statusCode', 500)
  })

  it('Should create a custom enhance error (whitout additional description)', async () => {
    const message = 'this is an error'
    const data = {
      extras: {
        someKey: 'some value',
      },
    }
    const error = new EnhanceError(message, data)

    expect(error).toHaveProperty('description', message)
    expect(error).toHaveProperty('extras', data.extras)
    expect(error).toHaveProperty('statusCode', 500)
  })

  it('Should create a custom 500 error', async () => {
    const message = 'this is an error'
    const error = new ServerError(message)

    expect(error).toHaveProperty('description', message)
    expect(error).toHaveProperty('statusCode', 500)
  })

  it('Should create a custom 400 error', async () => {
    const message = 'this is an error'
    const error = new BadRequestError(message)

    expect(error).toHaveProperty('description', message)
    expect(error).toHaveProperty('statusCode', 400)
  })

  it('Should create a custom 401 error', async () => {
    const message = 'this is an error'
    const error = new UnauthorizedError(message)

    expect(error).toHaveProperty('description', message)
    expect(error).toHaveProperty('statusCode', 401)
  })

  it('Should create a custom 403 error', async () => {
    const message = 'this is an error'
    const error = new ForbiddenError(message)

    expect(error).toHaveProperty('description', message)
    expect(error).toHaveProperty('statusCode', 403)
  })

  it('Should create a custom 404 error', async () => {
    const message = 'this is an error'
    const error = new NotFoundError(message)

    expect(error).toHaveProperty('description', message)
    expect(error).toHaveProperty('statusCode', 404)
  })

  it('Should create a custom 409 error', async () => {
    const message = 'this is an error'
    const error = new ConflictError(message)

    expect(error).toHaveProperty('description', message)
    expect(error).toHaveProperty('statusCode', 409)
  })

  it('Should create a custom 429 error', async () => {
    const message = 'this is an error'
    const error = new TooManyRequestError(message)

    expect(error).toHaveProperty('description', message)
    expect(error).toHaveProperty('statusCode', 429)
  })
})
