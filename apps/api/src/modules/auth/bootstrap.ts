import { db } from '~/prisma/clients.js'
import { config } from '~/utils/config.js'
import { auth } from './auth.js'

/**
 * Bootstrap the initial admin user if ADMIN__EMAIL and ADMIN__PASSWORD are set.
 *
 * - Skips silently when the env vars are empty
 * - Checks whether a user with that email already exists (idempotent)
 * - Creates the user via BetterAuth's admin `createUser` API so the
 *   password is properly hashed and an Account row is created
 *
 * Should be called once at startup, after the database is ready.
 */
export async function bootstrapAdmin(logger: { info: (msg: string) => void, warn: (msg: string) => void }) {
  const { email, password } = config.admin

  if (!email || !password) {
    return
  }

  const existing = await db.user.findFirst({ where: { email } })

  if (existing) {
    logger.info(`Admin user "${email}" already exists, skipping bootstrap`)
    return
  }

  await auth.api.createUser({
    body: {
      email,
      password,
      name: 'Admin',
      role: 'admin',
    },
  })

  logger.info(`Admin user "${email}" created successfully`)
}
