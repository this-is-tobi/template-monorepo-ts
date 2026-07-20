import { db } from '~/prisma/clients.js'
import { config } from '~/utils/config.js'
import { auth } from './auth.js'

/**
 * Bootstrap the initial admin user if BOOTSTRAP__EMAIL and BOOTSTRAP__PASSWORD are set.
 *
 * - Skips silently when the env vars are empty
 * - Checks whether a user with that email already exists (idempotent)
 * - Creates the user via BetterAuth's admin `createUser` API so the
 *   password is properly hashed and an Account row is created
 * - Handles race conditions (multiple replicas) by catching unique constraint errors
 *
 * Should be called once at startup, after the database is ready.
 */
export async function bootstrapAdmin(logger: { info: (msg: string) => void, warn: (msg: string) => void }) {
  const { email, password } = config.bootstrap

  if (!email || !password) {
    return
  }

  const existing = await db.user.findFirst({ where: { email } })

  if (existing) {
    // Heal admins bootstrapped by earlier versions: operator-created accounts
    // must be emailVerified, otherwise BetterAuth refuses to link a verified
    // OIDC sign-in (e.g. Keycloak with the same email) to them.
    if (!existing.emailVerified) {
      await db.user.update({ where: { id: existing.id }, data: { emailVerified: true } })
      logger.info(`Admin user "${email}" already exists — marked emailVerified for SSO account linking`)
      return
    }
    logger.info(`Admin user "${email}" already exists, skipping bootstrap`)
    return
  }

  try {
    await auth.api.createUser({
      body: {
        email,
        password,
        name: 'Admin',
        role: 'admin',
        // Operator-created account — trusted, and required for a verified
        // OIDC provider (Keycloak) to link to it on first SSO login.
        data: { emailVerified: true },
      },
    })

    logger.info(`Admin user "${email}" created successfully`)
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      logger.info(`Admin user "${email}" already exists, skipping bootstrap`)
      return
    }
    throw error
  }
}
