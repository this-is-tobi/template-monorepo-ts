import { execSync } from 'node:child_process'
import { config } from '~/utils/config.js'
import { db } from './clients.js'

export async function openConnection() {
  await db.$connect()
}

export async function closeConnection() {
  await db.$disconnect()
}

export async function migrateDb() {
  execSync(`bunx prisma migrate deploy --schema ${config.api.prismaSchemaPath}`, { stdio: 'inherit' })
}
