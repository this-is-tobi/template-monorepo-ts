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
