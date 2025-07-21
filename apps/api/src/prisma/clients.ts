import { PrismaClient } from '@prisma/client'

/**
 * Global Prisma database client instance
 * Used for database operations throughout the application
 */
export const db = new PrismaClient()
