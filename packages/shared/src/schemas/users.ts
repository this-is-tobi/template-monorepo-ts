import { z } from 'zod'
import { ErrorSchema } from './utils.js'

/**
 * Schema defining a user in the system
 *
 * @property id - Unique identifier for the user (UUID format)
 * @property firstname - User's first name (3-20 characters)
 * @property lastname - User's last name (3-20 characters)
 * @property email - User's email address (must be valid email format)
 * @property bio - Optional short biography (max 142 characters)
 */
export const UserSchema = z.object({
  id: z.uuid({ message: 'invalid UUID' }),
  firstname: z.string()
    .min(3, { message: 'firstname must be 3 at least characters long' })
    .max(20, { message: 'firstname must not exceed 20 characters' }),
  lastname: z.string()
    .min(3, { message: 'lastname must be 3 at least characters long' })
    .max(20, { message: 'lastname must not exceed 20 characters' }),
  email: z.email({ message: 'invalid email address' }),
  bio: z.string()
    .max(142, { message: 'bio must not exceed 142 characters' })
    .optional()
    .nullable(),
})

/**
 * TypeScript type derived from the UserSchema
 */
export type User = z.infer<typeof UserSchema>

/**
 * Schema for creating a new user
 *
 * @property responses - Possible API responses
 * @property responses.201 - Successful user creation response
 * @property responses.400 - Validation error response
 */
export const CreateUserSchema = {
  responses: {
    201: z.object({
      message: z.string().optional(),
      data: UserSchema,
    }),
    400: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetUsersSchema = {
  responses: {
    200: z.object({
      message: z.string().optional(),
      data: z.array(UserSchema),
    }),
    500: ErrorSchema,
  },
}

export const GetUserByIdSchema = {
  params: z.object({
    id: z.uuid(),
  }),
  responses: {
    200: z.object({
      message: z.string().optional(),
      data: UserSchema,
    }),
    404: ErrorSchema,
    500: ErrorSchema,
  },
}

export const UpdateUserSchema = {
  params: z.object({
    id: z.uuid(),
  }),
  responses: {
    200: z.object({
      message: z.string().optional(),
      data: UserSchema,
    }),
    500: ErrorSchema,
  },
}

export const DeleteUserSchema = {
  params: z.object({
    id: z.uuid(),
  }),
  responses: {
    200: z.object({
      message: z.string().optional(),
    }),
    500: ErrorSchema,
  },
}
