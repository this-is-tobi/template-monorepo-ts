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
 * Uses local prisma CLI from node_modules (symlinked in Dockerfile)
 */
export async function migrateDb() {
  execSync('bun run ./node_modules/prisma/build/index.js migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.API__DB_URL,
    },
  })
}
