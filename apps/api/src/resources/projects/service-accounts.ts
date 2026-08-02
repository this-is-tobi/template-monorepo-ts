import { db, dbRo } from '~/prisma/clients.js'

/**
 * Project service accounts — machine identities that own a project's API keys.
 *
 * A user-owned key dies with the person who made it: when they leave, the key
 * either breaks or lingers as a credential nobody owns. A service account is a
 * `user` row belonging to the *project*, so the CI token outlives whoever set
 * it up.
 *
 * It is deliberately a real user row rather than a separate principal type:
 * every authorisation path in this codebase resolves through `session.user.id`
 * (`requirePermission`, ownership fallbacks, `audit_log.actorId`). A parallel
 * identity type would mean branching all of them, which is a poor trade for a
 * template whose auth code is the part people read most.
 *
 * What keeps it from being a back door:
 * - no `account` row, so there is no password and no OIDC link — sign-in is
 *   impossible by construction, not by a flag someone can flip;
 * - the address lives on `.invalid`, reserved by RFC 2606 and guaranteed never
 *   to resolve, so a verified OIDC login can never be account-linked onto it;
 * - `role: 'service'`, which no permission check grants anything for;
 * - `serviceProjectId` cascades, so deleting the project revokes the keys.
 */

/** Reserved by RFC 2606 — guaranteed never to be a real, routable domain. */
export const SERVICE_ACCOUNT_EMAIL_DOMAIN = 'service.invalid'

/** Role marking a user row as a machine identity. */
export const SERVICE_ACCOUNT_ROLE = 'service'

/** The one address a project's service account can ever have. */
export function serviceAccountEmail(projectId: string): string {
  return `${projectId}@${SERVICE_ACCOUNT_EMAIL_DOMAIN}`
}

/** Whether an address belongs to the reserved service-account namespace. */
export function isServiceAccountEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.toLowerCase().endsWith(`@${SERVICE_ACCOUNT_EMAIL_DOMAIN}`)
}

/** Whether a user row is a machine identity rather than a person. */
export function isServiceAccount(user: { role?: string | null, serviceProjectId?: string | null } | null | undefined): boolean {
  if (!user) return false
  return user.serviceProjectId != null || user.role === SERVICE_ACCOUNT_ROLE
}

/**
 * The project's service account, created on first use.
 *
 * One per project: the account is the project's identity, and multiple keys
 * hang off it. Concurrent first-use races resolve on the unique email, so a
 * duplicate insert falls back to a read rather than failing the request.
 */
export async function getOrCreateServiceAccount(project: { id: string, name: string }) {
  const existing = await dbRo.user.findFirst({ where: { serviceProjectId: project.id } })
  if (existing) return existing

  try {
    return await db.user.create({
      data: {
        name: `${project.name} (service)`,
        email: serviceAccountEmail(project.id),
        // Never true: `accountLinking.trustedProviders` adopts an existing
        // account when a verified OIDC email matches, and an unverified
        // address on an unroutable domain can never be matched.
        emailVerified: false,
        role: SERVICE_ACCOUNT_ROLE,
        serviceProjectId: project.id,
      },
    })
  } catch {
    // Unique-email collision — another request created it first.
    const raced = await db.user.findFirst({ where: { serviceProjectId: project.id } })
    if (raced) return raced
    throw new Error(`Failed to provision a service account for project ${project.id}`)
  }
}

/** Look up the service account of a project, if one has been provisioned. */
export function getServiceAccount(projectId: string) {
  return dbRo.user.findFirst({ where: { serviceProjectId: projectId } })
}
