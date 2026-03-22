import { z } from 'zod'
import { ErrorSchema, UnauthorizedSchema } from './utils.js'

/**
 * Available PrimeVue color palette names (base colors).
 */
export const ThemeColorNames = [
  'zinc',
  'slate',
  'stone',
  'gray',
  'neutral',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
] as const

export const ThemeColorNameSchema = z.enum(ThemeColorNames)

/**
 * Platform-level theme configuration persisted by the API and applied globally.
 *
 * Admin-only. Controls the visual identity for every user on the platform.
 *
 * @property primaryColor  – PrimeVue palette name for the primary color
 * @property surfaceColor  – PrimeVue palette name for surface/background tones
 * @property logoUrl       – Optional URL for a custom logo displayed in the header
 * @property preset        – Optional raw PrimeVue preset JSON override (advanced)
 */
export const ThemeConfigSchema = z.object({
  primaryColor: ThemeColorNameSchema.default('zinc'),
  surfaceColor: ThemeColorNameSchema.default('zinc'),
  logoUrl: z.url().optional().or(z.literal('')),
  preset: z.record(z.string(), z.unknown()).optional(),
})

export type ThemeConfig = z.infer<typeof ThemeConfigSchema>

/**
 * GET /api/v1/theme — public, no auth required.
 */
export const GetThemeSchema = {
  responses: {
    200: z.object({
      data: ThemeConfigSchema,
    }),
    500: ErrorSchema,
  },
} as const

/**
 * PUT /api/v1/theme — admin-only.
 */
export const UpdateThemeSchema = {
  body: ThemeConfigSchema,
  responses: {
    200: z.object({
      message: z.string().optional(),
      data: ThemeConfigSchema,
    }),
    400: ErrorSchema,
    401: UnauthorizedSchema,
    403: ErrorSchema,
    500: ErrorSchema,
  },
} as const
