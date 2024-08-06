import { db, migrate } from './clients.js'

export async function openConnection() {
  await db.$connect()
}

export async function closeConnection() {
  await db.$disconnect()
}

export async function migrateDb() {
  await migrate.parse([])
}
