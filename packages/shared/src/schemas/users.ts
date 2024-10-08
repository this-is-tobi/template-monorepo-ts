import { z } from 'zod'
import { ErrorSchema } from './utils.js'

export const UserSchema = z.object({
  id: z.string()
    .uuid({ message: 'invalid UUID' }),
  firstname: z.string()
    .min(3, { message: 'firstname must be 3 at least characters long' })
    .max(20, { message: 'firstname must not exceed 20 characters' }),
  lastname: z.string()
    .min(3, { message: 'lastname must be 3 at least characters long' })
    .max(20, { message: 'lastname must not exceed 20 characters' }),
  email: z.string()
    .email({ message: 'invalid email address' }),
  bio: z.string()
    .max(142, { message: 'bio must not exceed 142 characters' })
    .optional()
    .nullable(),
})

export type User = Zod.infer<typeof UserSchema>

export const CreateUserSchema = {
  responses: {
    201: z.object({
      message: z.string()
        .optional(),
      data: UserSchema,
    }),
    400: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetUsersSchema = {
  responses: {
    200: z.object({
      message: z.string()
        .optional(),
      data: z.array(UserSchema),
    }),
    500: ErrorSchema,
  },
}

export const GetUserByIdSchema = {
  params: z.object({
    id: z.string()
      .uuid(),
  }),
  responses: {
    200: z.object({
      message: z.string()
        .optional(),
      data: UserSchema,
    }),
    404: ErrorSchema,
    500: ErrorSchema,
  },
}

export const UpdateUserSchema = {
  params: z.object({
    id: z.string()
      .uuid(),
  }),
  responses: {
    200: z.object({
      message: z.string()
        .optional(),
      data: UserSchema,
    }),
    500: ErrorSchema,
  },
}

export const DeleteUserSchema = {
  params: z.object({
    id: z.string()
      .uuid(),
  }),
  responses: {
    200: z.object({
      message: z.string()
        .optional(),
    }),
    500: ErrorSchema,
  },
}
