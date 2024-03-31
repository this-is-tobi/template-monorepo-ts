import { PrismaClient } from '@prisma/client'
import { MigrateDeploy } from '@prisma/migrate'

export const db = new PrismaClient()

export const migrate = MigrateDeploy.new()
