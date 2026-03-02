import path from 'node:path'
import { defineConfig } from 'prisma/config'

// Use current working directory for runtime path resolution
const basePath = process.cwd()

export default defineConfig({
  schema: path.join(basePath, 'prisma'),
  migrations: {
    path: path.join(basePath, 'prisma', 'migrations'),
  },
  datasource: {
    url: process.env.DATABASE_URL ?? process.env.DB__URL ?? '',
  },
})
