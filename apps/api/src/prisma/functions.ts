import { execSync } from 'node:child_process'

import { config } from '../utils/config.ts'
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
 * Uses the schema path from the config file
 */
export async function migrateDb() {
  const schemaPath = config.api.prismaSchemaPath

  // Execute prisma migrate deploy command with the schema path
  execSync(`bunx prisma migrate deploy --schema ${schemaPath}`, {
    stdio: 'inherit',
  })
}
