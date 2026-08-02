import { db, dbRo } from '~/prisma/__mocks__/clients.js'
import {
  getOrCreateServiceAccount,
  getServiceAccount,
  isServiceAccount,
  isServiceAccountEmail,
  SERVICE_ACCOUNT_EMAIL_DOMAIN,
  SERVICE_ACCOUNT_ROLE,
  serviceAccountEmail,
} from './service-accounts.js'

vi.mock('~/database.js')

describe('[Projects] - Service accounts', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('serviceAccountEmail', () => {
    it('should address the account on a domain that can never resolve', () => {
      // `.invalid` is reserved by RFC 2606. That is what stops a verified OIDC
      // sign-in from being account-linked onto a machine identity.
      expect(serviceAccountEmail('proj-1')).toBe(`proj-1@${SERVICE_ACCOUNT_EMAIL_DOMAIN}`)
      expect(SERVICE_ACCOUNT_EMAIL_DOMAIN.endsWith('.invalid')).toBe(true)
    })

    it('should give each project its own address', () => {
      expect(serviceAccountEmail('a')).not.toBe(serviceAccountEmail('b'))
    })
  })

  describe('isServiceAccountEmail', () => {
    it('should recognise the reserved namespace', () => {
      expect(isServiceAccountEmail(serviceAccountEmail('proj-1'))).toBe(true)
      expect(isServiceAccountEmail(`PROJ-1@${SERVICE_ACCOUNT_EMAIL_DOMAIN.toUpperCase()}`)).toBe(true)
    })

    it('should not mistake a real address for one', () => {
      expect(isServiceAccountEmail('someone@example.com')).toBe(false)
      // A lookalike that merely *contains* the domain must not pass, or the
      // sign-up guard could be talked out of firing.
      expect(isServiceAccountEmail('service.invalid@example.com')).toBe(false)
      expect(isServiceAccountEmail(null)).toBe(false)
      expect(isServiceAccountEmail(undefined)).toBe(false)
    })
  })

  describe('isServiceAccount', () => {
    it('should detect one by either marker', () => {
      expect(isServiceAccount({ serviceProjectId: 'proj-1' })).toBe(true)
      expect(isServiceAccount({ role: SERVICE_ACCOUNT_ROLE })).toBe(true)
    })

    it('should treat a person as a person', () => {
      expect(isServiceAccount({ role: 'user', serviceProjectId: null })).toBe(false)
      expect(isServiceAccount({ role: 'admin', serviceProjectId: null })).toBe(false)
      expect(isServiceAccount(null)).toBe(false)
      expect(isServiceAccount(undefined)).toBe(false)
    })
  })

  describe('getOrCreateServiceAccount', () => {
    it('should reuse the existing account rather than minting a second', () => {
      // One identity per project: two would split the audit trail for the
      // same actor.
      dbRo.user.findFirst.mockResolvedValueOnce({ id: 'svc-1' } as never)

      return expect(getOrCreateServiceAccount({ id: 'proj-1', name: 'Apollo' }))
        .resolves
        .toMatchObject({ id: 'svc-1' })
        .then(() => expect(db.user.create).not.toHaveBeenCalled())
    })

    it('should create one with no credential and a name that says what it is', async () => {
      dbRo.user.findFirst.mockResolvedValueOnce(null)
      db.user.create.mockResolvedValueOnce({ id: 'svc-1' } as never)

      await getOrCreateServiceAccount({ id: 'proj-1', name: 'Apollo' })

      expect(db.user.create).toHaveBeenCalledWith({
        data: {
          name: 'Apollo (service)',
          email: serviceAccountEmail('proj-1'),
          emailVerified: false,
          role: SERVICE_ACCOUNT_ROLE,
          serviceProjectId: 'proj-1',
        },
      })
    })

    it('should never mark the address verified', async () => {
      // A verified address is what `accountLinking.trustedProviders` adopts —
      // marking one verified would open the machine identity to an SSO login.
      dbRo.user.findFirst.mockResolvedValueOnce(null)
      db.user.create.mockResolvedValueOnce({ id: 'svc-1' } as never)

      await getOrCreateServiceAccount({ id: 'proj-1', name: 'Apollo' })

      expect(db.user.create.mock.calls[0]![0].data.emailVerified).toBe(false)
    })

    it('should fall back to a read when two requests race the unique email', async () => {
      dbRo.user.findFirst.mockResolvedValueOnce(null)
      db.user.create.mockRejectedValueOnce(new Error('unique constraint'))
      db.user.findFirst.mockResolvedValueOnce({ id: 'svc-raced' } as never)

      await expect(getOrCreateServiceAccount({ id: 'proj-1', name: 'Apollo' }))
        .resolves
        .toMatchObject({ id: 'svc-raced' })
    })

    it('should surface a real failure rather than returning nothing', async () => {
      dbRo.user.findFirst.mockResolvedValueOnce(null)
      db.user.create.mockRejectedValueOnce(new Error('database is down'))
      db.user.findFirst.mockResolvedValueOnce(null)

      await expect(getOrCreateServiceAccount({ id: 'proj-1', name: 'Apollo' }))
        .rejects
        .toThrow(/Failed to provision a service account/)
    })
  })

  describe('getServiceAccount', () => {
    it('should look the account up by its project', async () => {
      dbRo.user.findFirst.mockResolvedValueOnce({ id: 'svc-1' } as never)

      await getServiceAccount('proj-1')

      expect(dbRo.user.findFirst).toHaveBeenCalledWith({ where: { serviceProjectId: 'proj-1' } })
    })
  })
})
