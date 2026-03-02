import { z } from 'zod'
import { ErrorSchema, ForbiddenSchema, UnauthorizedSchema } from './utils.js'

/**
 * Schema defining a user in the system
 *
 * @property id - Unique identifier for the user (UUID format)
 * @property name - User's display name
 * @property email - User's email address (must be valid email format)
 * @property firstname - User's first name (3-20 characters)
 * @property lastname - User's last name (3-20 characters)
 * @property bio - Optional short biography (max 142 characters)
 * @property role - User's role (single value like "user", "admin" or comma-separated like "user,admin")
 * @property emailVerified - Whether the user's email has been verified
 * @property image - Optional profile image URL
 * @property createdAt - Account creation timestamp
 * @property updatedAt - Last update timestamp
 */
export const UserSchema = z.object({
  id: z.uuid({ message: 'invalid UUID' }),
  name: z.string(),
  email: z.email({ message: 'invalid email address' }),
  firstname: z.string()
    .min(3, { message: 'firstname must be 3 at least characters long' })
    .max(20, { message: 'firstname must not exceed 20 characters' }),
  lastname: z.string()
    .min(3, { message: 'lastname must be 3 at least characters long' })
    .max(20, { message: 'lastname must not exceed 20 characters' }),
  bio: z.string()
    .max(142, { message: 'bio must not exceed 142 characters' })
    .optional()
    .nullable(),
  role: z.string().default('user'),
  emailVerified: z.boolean().default(false),
  image: z.string().nullable().optional(),
  banned: z.boolean().nullable().optional(),
  banReason: z.string().nullable().optional(),
  banExpires: z.iso.datetime().nullable().optional(),
  twoFactorEnabled: z.boolean().nullable().optional(),
  createdAt: z.iso.datetime().optional(),
  updatedAt: z.iso.datetime().optional(),
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
 * @property responses.401 - Unauthorized
 * @property responses.403 - Forbidden
 */
export const CreateUserSchema = {
  responses: {
    201: z.object({
      message: z.string().optional(),
      data: UserSchema,
    }),
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    500: ErrorSchema,
  },
}

export const GetUsersSchema = {
  responses: {
    200: z.object({
      message: z.string().optional(),
      data: z.array(UserSchema),
    }),
    401: UnauthorizedSchema,
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
    401: UnauthorizedSchema,
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
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
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
    401: UnauthorizedSchema,
    403: ForbiddenSchema,
    500: ErrorSchema,
  },
}
