import { execSync } from 'node:child_process'
import { db } from './clients.js'

/**
 * Opens a connection to the database
 */
export async function openConnection() {
  await db.$connect()
}

/**
 * Closes the connection to the database
 */
export async function closeConnection() {
  await db.$disconnect()
}

/**
 * Runs Prisma migrations on the database
 * Uses the Prisma config file (prisma.config.ts) for configuration
 */
export async function migrateDb() {
  // Execute prisma migrate deploy command
  // Configuration is loaded from prisma.config.ts
  execSync('bunx prisma migrate deploy', {
    stdio: 'inherit',
  })
}
