import type { FastifyReply, FastifyRequest } from 'fastify'
import { ServerError, addReqLogs, sendCreated, sendOk } from '@/utils/index.js'

export const createResource = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    // const _data = req.body
    const message = 'resource successfully created'
    addReqLogs({ req, description: message })
    sendCreated(res, { message })
  } catch (error) {
    throw new ServerError('failed to create resource', { extras: { error } })
  }
}

export const getResources = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const message = 'resources successfully retrieved'
    addReqLogs({ req, description: message })
    sendOk(res, { message })
  } catch (error) {
    throw new ServerError('failed to retrieves resources', { extras: { error } })
  }
}

export const getResourceById = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const { id } = req.params as Record<string, any>
    const message = 'resource successfully retrieved'
    addReqLogs({ req, description: message, extras: { id } })
    sendOk(res, { message })
  } catch (error) {
    throw new ServerError('failed to retrieve resource', { extras: { error } })
  }
}

export const updateResource = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const { id } = req.params as Record<string, any>
    const message = 'resource successfully updated'
    addReqLogs({ req, description: message, extras: { id } })
    sendOk(res, { message })
  } catch (error) {
    throw new ServerError('failed to update resource', { extras: { error } })
  }
}

export const deleteResource = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const { id } = req.params as Record<string, any>
    const message = 'resource successfully deleted'
    addReqLogs({ req, description: message, extras: { id } })
    sendOk(res, { message })
  } catch (error) {
    throw new ServerError('failed to delete resource', { extras: { error } })
  }
}
