import { z } from 'zod'
import { ErrorSchema, ForbiddenSchema, UnauthorizedSchema } from './utils.js'

/**
 * Schema defining a project in the system
 *
 * @property id - Unique identifier for the project (UUID format)
 * @property name - Project name (3–100 characters)
 * @property description - Optional description (max 500 characters)
 * @property ownerId - UUID of the user who owns this project
 * @property createdAt - Creation timestamp
 * @property updatedAt - Last update timestamp
 */
export const ProjectSchema = z.object({
  id: z.uuid({ message: 'invalid UUID' }),
  name: z.string()
    .min(3, { message: 'name must be at least 3 characters long' })
    .max(100, { message: 'name must not exceed 100 characters' }),
  description: z.string()
    .max(500, { message: 'description must not exceed 500 characters' })
    .optional()
    .nullable(),
  ownerId: z.uuid({ message: 'invalid owner UUID' }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

/**
 * TypeScript type derived from the ProjectSchema
 */
export type Project = z.infer<typeof ProjectSchema>

/**
 * Body schema shared by create/update — name + optional description (no ownerId).
 */
const ProjectBodySchema = ProjectSchema.pick({ name: true, description: true })

/**
 * Schema for creating a new project
 */
export const CreateProjectSchema = {
  body: ProjectBodySchema,
  responses: {
    201: z.object({
      message: z.string().optional(),
      data: ProjectSchema,
    }),
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    500: ErrorSchema,
  },
}

export const GetProjectsSchema = {
  responses: {
    200: z.object({
      message: z.string().optional(),
      data: z.array(ProjectSchema),
    }),
    401: UnauthorizedSchema,
    500: ErrorSchema,
  },
}

export const GetProjectByIdSchema = {
  params: z.object({
    id: z.uuid(),
  }),
  responses: {
    200: z.object({
      message: z.string().optional(),
      data: ProjectSchema,
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}

export const UpdateProjectSchema = {
  params: z.object({
    id: z.uuid(),
  }),
  body: ProjectBodySchema,
  responses: {
    200: z.object({
      message: z.string().optional(),
      data: ProjectSchema,
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}

export const DeleteProjectSchema = {
  params: z.object({
    id: z.uuid(),
  }),
  responses: {
    200: z.object({
      message: z.string().optional(),
    }),
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}

/**
 * Body type for creating a project (name + optional description, no ownerId).
 */
export type CreateProjectBody = z.infer<typeof CreateProjectSchema.body>

/**
 * Body type for updating a project (name + optional description).
 */
export type UpdateProjectBody = z.infer<typeof UpdateProjectSchema.body>
