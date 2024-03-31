import { db, migrate } from './clients.js'

export const openConnection = async () => {
  await db.$connect()
}

export const closeConnection = async () => {
  await db.$disconnect()
}

export const migrateDb = async () => {
  await migrate.parse([])
}
