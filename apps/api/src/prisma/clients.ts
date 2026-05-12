import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '~/generated/prisma/client.js'
import { config } from '~/utils/config.js'

/**
 * Initialize Prisma adapter for PostgreSQL without Rust engine
 */
const adapter = new PrismaPg({ connectionString: config.db.url, max: config.db.poolMax })

/**
 * Global Prisma database client instance
 * Used for database operations throughout the application
 */
export const db = new PrismaClient({ adapter })

/**
 * Read-only Prisma client — routed to the CNPG replica service (DB__READ_URL).
 * Falls back to the primary when DB__READ_URL is not configured so the app
 * works in single-instance and development setups without any changes.
 *
 * Use this client for pure read operations (findMany, findUnique, count).
 * Always use `db` for writes and any read that must see the latest committed
 * write (e.g. a GET that immediately follows a POST in the same request chain).
 */
const roAdapter = new PrismaPg({ connectionString: config.db.readUrl || config.db.url, max: config.db.poolRoMax })
export const dbRo = new PrismaClient({ adapter: roAdapter })
