/**
 * Demo seed — populates a realistic dataset so the UI renders like a
 * lived-in product: users, organizations with mixed roles, projects with
 * member rosters, a pending invitation, API keys, and audit history.
 *
 * Run (from apps/api, with the dev database up):
 *   bun run db:seed-demo          # or from the root: bun run db:seed
 *
 * Idempotent: entities are looked up by email / slug / name and skipped
 * when they already exist, so it can be re-run safely after a db:reset.
 *
 * Credentials created:
 *   admin@example.com  / admin          (platform admin — matches BOOTSTRAP__* defaults)
 *   alice@demo.local   / demo-1234!     (owner of Acme)
 *   bob@demo.local     / demo-1234!     (admin of Acme, owner of Globex)
 *   carol@demo.local   / demo-1234!
 *   dave@demo.local    / demo-1234!
 *   erin@demo.local    / demo-1234!
 */

import { randomUUID } from 'node:crypto'
import { auth } from '~/modules/auth/auth.js'
import { db } from '~/prisma/clients.js'

const DEMO_PASSWORD = 'demo-1234!'

const ADMIN_EMAIL = process.env.BOOTSTRAP__EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.BOOTSTRAP__PASSWORD || 'admin'

/** Days ago → Date (staggers createdAt so lists look organic). */
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

interface DemoUser {
  email: string
  name: string
  firstname: string
  lastname: string
  role?: 'admin' | 'user'
  password?: string
}

const DEMO_USERS: DemoUser[] = [
  { email: ADMIN_EMAIL, name: 'Admin', firstname: 'Admin', lastname: '', role: 'admin', password: ADMIN_PASSWORD },
  { email: 'alice@demo.local', name: 'Alice Rivera', firstname: 'Alice', lastname: 'Rivera' },
  { email: 'bob@demo.local', name: 'Bob Chen', firstname: 'Bob', lastname: 'Chen' },
  { email: 'carol@demo.local', name: 'Carol Novak', firstname: 'Carol', lastname: 'Novak' },
  { email: 'dave@demo.local', name: 'Dave Okafor', firstname: 'Dave', lastname: 'Okafor' },
  { email: 'erin@demo.local', name: 'Erin Dubois', firstname: 'Erin', lastname: 'Dubois' },
]

async function ensureUser(spec: DemoUser): Promise<string> {
  const existing = await db.user.findFirst({ where: { email: spec.email }, select: { id: true, emailVerified: true } })
  if (existing) {
    // Heal rows created by earlier seed versions: operator-created accounts
    // must be emailVerified, otherwise BetterAuth refuses to link a verified
    // OIDC sign-in (e.g. Keycloak) to them.
    if (!existing.emailVerified) {
      await db.user.update({ where: { id: existing.id }, data: { emailVerified: true } })
    }
    return existing.id
  }

  // Through BetterAuth so the password is hashed, an Account row is
  // created, and the personal-org hook fires.
  const created = await auth.api.createUser({
    body: {
      email: spec.email,
      password: spec.password ?? DEMO_PASSWORD,
      name: spec.name,
      role: spec.role ?? 'user',
      // emailVerified: operator-created accounts are trusted — this also
      // lets a verified OIDC provider (Keycloak) link to them on first SSO login.
      data: { firstname: spec.firstname, lastname: spec.lastname, emailVerified: true },
    },
  })
  return created.user.id
}

async function ensureOrg(slug: string, name: string, createdAt: Date): Promise<string> {
  const existing = await db.organization.findFirst({ where: { slug }, select: { id: true } })
  if (existing) return existing.id
  const org = await db.organization.create({ data: { slug, name, createdAt } })
  return org.id
}

async function ensureMember(userId: string, organizationId: string, role: string, createdAt: Date): Promise<void> {
  const existing = await db.member.findFirst({ where: { userId, organizationId } })
  if (existing) return
  await db.member.create({ data: { userId, organizationId, role, createdAt } })
}

interface ProjectSpec {
  name: string
  description: string
  ownerId: string
  organizationId: string
  createdAt: Date
  members: Array<{ userId: string, role: 'admin' | 'member' | 'viewer' }>
}

async function ensureProject(spec: ProjectSpec): Promise<string> {
  const existing = await db.project.findFirst({
    where: { name: spec.name, organizationId: spec.organizationId },
    select: { id: true },
  })
  if (existing) return existing.id

  const projectId = randomUUID()
  await db.project.create({
    data: {
      id: projectId,
      name: spec.name,
      description: spec.description,
      ownerId: spec.ownerId,
      organizationId: spec.organizationId,
      createdAt: spec.createdAt,
    },
  })
  // Creator joins the roster as owner (mirrors the business layer).
  await db.projectMember.create({
    data: { id: randomUUID(), projectId, userId: spec.ownerId, role: 'owner', createdAt: spec.createdAt },
  })
  for (const member of spec.members) {
    await db.projectMember.create({
      data: { id: randomUUID(), projectId, userId: member.userId, role: member.role, createdAt: spec.createdAt },
    })
  }
  return projectId
}

async function ensureInvitation(email: string, organizationId: string, inviterId: string): Promise<void> {
  const existing = await db.invitation.findFirst({ where: { email, organizationId, status: 'pending' } })
  if (existing) return
  await db.invitation.create({
    data: {
      email,
      organizationId,
      inviterId,
      role: 'member',
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })
}

async function ensureApiKey(userId: string, name: string, expiresInSeconds?: number): Promise<void> {
  const existing = await db.apiKey.findFirst({ where: { referenceId: userId, name } })
  if (existing) return
  try {
    await auth.api.createApiKey({
      body: {
        name,
        userId,
        ...(expiresInSeconds ? { expiresIn: expiresInSeconds } : {}),
      },
    })
  } catch (err) {
    console.warn(`[seed-demo] could not create API key "${name}":`, err instanceof Error ? err.message : err)
  }
}

async function seedAuditTrail(actorId: string, organizationId: string, projectId: string): Promise<void> {
  const count = await db.auditLog.count()
  if (count > 0) return
  const entries = [
    { action: 'organization:create', resourceType: 'organization', resourceId: organizationId, days: 21 },
    { action: 'project:create', resourceType: 'project', resourceId: projectId, days: 14 },
    { action: 'organization:member:add', resourceType: 'organization', resourceId: organizationId, days: 10 },
    { action: 'project:member:add', resourceType: 'project', resourceId: projectId, days: 7 },
    { action: 'project:update', resourceType: 'project', resourceId: projectId, days: 2 },
  ]
  for (const entry of entries) {
    await db.auditLog.create({
      data: {
        actorId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        organizationId,
        details: { seeded: true },
        createdAt: daysAgo(entry.days),
      },
    })
  }
}

async function run() {
  console.warn('[seed-demo] seeding demo dataset…')

  // ── Users (personal orgs auto-created by the auth hook) ─────────────
  const ids: Record<string, string> = {}
  for (const spec of DEMO_USERS) {
    ids[spec.email] = await ensureUser(spec)
  }
  const alice = ids['alice@demo.local']
  const bob = ids['bob@demo.local']
  const carol = ids['carol@demo.local']
  const dave = ids['dave@demo.local']
  const erin = ids['erin@demo.local']

  // ── Organizations with mixed roles ──────────────────────────────────
  const acme = await ensureOrg('acme', 'Acme Corp', daysAgo(30))
  await ensureMember(alice, acme, 'owner', daysAgo(30))
  await ensureMember(bob, acme, 'admin', daysAgo(28))
  await ensureMember(carol, acme, 'member', daysAgo(21))
  await ensureMember(dave, acme, 'member', daysAgo(14))

  const globex = await ensureOrg('globex', 'Globex Industries', daysAgo(18))
  await ensureMember(bob, globex, 'owner', daysAgo(18))
  await ensureMember(erin, globex, 'member', daysAgo(12))

  // ── Projects with rosters ───────────────────────────────────────────
  const apiGateway = await ensureProject({
    name: 'API Gateway',
    description: 'Edge routing, rate limiting and auth termination for public traffic.',
    ownerId: alice,
    organizationId: acme,
    createdAt: daysAgo(25),
    members: [
      { userId: bob, role: 'admin' },
      { userId: carol, role: 'member' },
      { userId: dave, role: 'viewer' },
    ],
  })
  await ensureProject({
    name: 'Billing Service',
    description: 'Invoicing, usage metering and payment-provider integration.',
    ownerId: bob,
    organizationId: acme,
    createdAt: daysAgo(16),
    members: [
      { userId: carol, role: 'member' },
    ],
  })
  await ensureProject({
    name: 'Design System',
    description: 'Shared component library, tokens and documentation site.',
    ownerId: carol,
    organizationId: acme,
    createdAt: daysAgo(9),
    members: [
      { userId: alice, role: 'viewer' },
      { userId: dave, role: 'member' },
    ],
  })
  await ensureProject({
    name: 'Data Pipeline',
    description: 'Ingestion, transformation and warehouse sync jobs.',
    ownerId: bob,
    organizationId: globex,
    createdAt: daysAgo(11),
    members: [
      { userId: erin, role: 'member' },
    ],
  })

  // ── Pending invitation for the admin (renders on the dashboard) ─────
  await ensureInvitation(ADMIN_EMAIL, acme, alice)

  // ── API keys (one healthy, one expiring soon → dashboard warning) ───
  await ensureApiKey(ids[ADMIN_EMAIL], 'CI pipeline')
  await ensureApiKey(ids[ADMIN_EMAIL], 'Legacy integration', 3 * 24 * 60 * 60)

  // ── Audit history ───────────────────────────────────────────────────
  await seedAuditTrail(alice, acme, apiGateway)

  console.warn('[seed-demo] done.')
  console.warn(`[seed-demo] sign in with ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (platform admin)`)
  console.warn(`[seed-demo] or any of alice|bob|carol|dave|erin@demo.local / ${DEMO_PASSWORD}`)
  await db.$disconnect()
}

run().catch((err) => {
  if (err instanceof Error && (err.message.includes('ECONNREFUSED') || ('code' in err && err.code === 'ECONNREFUSED'))) {
    console.error('[seed-demo] cannot reach the database — is it running?')
    console.error('[seed-demo] start it with: docker compose -f docker/docker-compose.dev.yml up db -d   (or `make db-seed`, which does it for you)')
    process.exit(1)
  }
  console.error('[seed-demo] failed:', err)
  process.exit(1)
})
