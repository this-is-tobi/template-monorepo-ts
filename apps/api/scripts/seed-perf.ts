/**
 * Seed script — populates a stable set of k6 test users.
 *
 * Run once before any k6 scenario that requires authenticated traffic:
 *   bun run apps/api/scripts/seed-perf.ts
 *
 * The script is idempotent: users that already exist are left untouched.
 * It writes the generated credentials to stdout as JSON so the Makefile
 * (or any CI step) can pass them to k6 via env vars.
 *
 * Configuration (env vars):
 *   ADMIN__EMAIL            Admin email  (default: admin@example.com)
 *   ADMIN__PASSWORD         Admin password (default: admin)
 *   K6_POPULATION_USERS     Number of test users to seed (default: 20)
 *   K6_USER_PASSWORD        Password to set for every test user (default: k6-password-1234!)
 *   K6_USER_EMAIL_PREFIX    Email prefix  (default: k6-user-)
 *   K6_USER_EMAIL_DOMAIN    Email domain  (default: example.com)
 */

import { auth } from '~/modules/auth/auth.js'
import { db } from '~/prisma/clients.js'

const POPULATION = Number.parseInt(process.env.K6_POPULATION_USERS ?? '20', 10)
const USER_PASSWORD = process.env.K6_USER_PASSWORD ?? 'k6-password-1234!'
const EMAIL_PREFIX = process.env.K6_USER_EMAIL_PREFIX ?? 'k6-user-'
const EMAIL_DOMAIN = process.env.K6_USER_EMAIL_DOMAIN ?? 'example.com'

function userEmail(i: number) {
  return `${EMAIL_PREFIX}${i}@${EMAIL_DOMAIN}`
}

async function run() {
  const seeded: Array<{ index: number, email: string, password: string, created: boolean }> = []
  let skipped = 0

  for (let i = 0; i < POPULATION; i++) {
    const email = userEmail(i)
    const existing = await db.user.findFirst({ where: { email } })

    if (existing) {
      seeded.push({ index: i, email, password: USER_PASSWORD, created: false })
      skipped++
      continue
    }

    await auth.api.createUser({
      body: {
        email,
        password: USER_PASSWORD,
        name: `k6-user-${i}`,
        role: 'user',
      },
    })

    seeded.push({ index: i, email, password: USER_PASSWORD, created: true })
  }

  const created = seeded.filter(u => u.created).length

  // Human-readable summary on stderr so stdout stays machine-parseable JSON.
  process.stderr.write(`[seed-perf] ${created} users created, ${skipped} already existed (total: ${POPULATION})\n`)

  // Machine-readable output: k6 env var block ready for `export $(...)`.
  process.stdout.write(`${JSON.stringify({
    K6_POPULATION_USERS: POPULATION,
    K6_USER_PASSWORD: USER_PASSWORD,
    K6_USER_EMAIL_PREFIX: EMAIL_PREFIX,
    K6_USER_EMAIL_DOMAIN: EMAIL_DOMAIN,
  }, null, 2)}\n`)
}

run().catch((err) => {
  process.stderr.write(`[seed-perf] error: ${err.message}\n`)
  process.exit(1)
})
