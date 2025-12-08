import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '~/generated/prisma/client.js'
import { config } from '~/utils/config.js'

/**
 * Initialize Prisma adapter for PostgreSQL without Rust engine
 */
const adapter = new PrismaPg({ connectionString: config.api.dbUrl })

/**
 * Global Prisma database client instance
 * Used for database operations throughout the application
 */
export const db = new PrismaClient({ adapter })
