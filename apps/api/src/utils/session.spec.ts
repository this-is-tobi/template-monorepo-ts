import type { FastifyRequest } from 'fastify'
import { getActiveOrgId, getActiveOrgIdFromSession, getUserId, getUserRole } from './session.js'

function reqWith(session: unknown): FastifyRequest {
  return { session } as unknown as FastifyRequest
}

describe('utils/session', () => {
  describe('getUserId', () => {
    it('returns the user id when the session has one', () => {
      expect(getUserId(reqWith({ user: { id: 'u-1' } }))).toBe('u-1')
    })

    it('returns undefined when the session is missing', () => {
      expect(getUserId(reqWith(undefined))).toBeUndefined()
    })

    it('returns undefined when the user object is missing', () => {
      expect(getUserId(reqWith({}))).toBeUndefined()
    })
  })

  describe('getUserRole', () => {
    it('returns the user role when present', () => {
      expect(getUserRole(reqWith({ user: { id: 'u-1', role: 'admin' } }))).toBe('admin')
    })

    it('returns undefined when the role is unset', () => {
      expect(getUserRole(reqWith({ user: { id: 'u-1' } }))).toBeUndefined()
    })

    it('returns undefined when the session is missing', () => {
      expect(getUserRole(reqWith(undefined))).toBeUndefined()
    })
  })

  describe('getActiveOrgId', () => {
    it('returns the active org id when set on the session record', () => {
      expect(getActiveOrgId(reqWith({ session: { id: 's-1', userId: 'u-1', activeOrganizationId: 'org-1' } })))
        .toBe('org-1')
    })

    it('returns undefined when the session record has no active org', () => {
      expect(getActiveOrgId(reqWith({ session: { id: 's-1', userId: 'u-1' } }))).toBeUndefined()
    })

    it('returns undefined when the request session is missing', () => {
      expect(getActiveOrgId(reqWith(undefined))).toBeUndefined()
    })
  })

  describe('getActiveOrgIdFromSession', () => {
    it('extracts the active org id from a raw BetterAuth session object', () => {
      const session = { user: { id: 'u-1' }, session: { activeOrganizationId: 'org-2' } }
      expect(getActiveOrgIdFromSession(session)).toBe('org-2')
    })

    it('returns undefined when the inner session is missing', () => {
      expect(getActiveOrgIdFromSession({})).toBeUndefined()
    })

    it('returns undefined when the inner session has no active org', () => {
      expect(getActiveOrgIdFromSession({ session: { id: 's-1', userId: 'u-1' } })).toBeUndefined()
    })
  })
})
