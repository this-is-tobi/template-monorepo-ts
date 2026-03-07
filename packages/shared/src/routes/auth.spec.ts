import { describe, expect, it } from 'vitest'
import { authRoutes } from './auth.js'

describe('authRoutes', () => {
  describe('signIn', () => {
    it('has correct method and path', () => {
      expect(authRoutes.signIn.method).toBe('POST')
      expect(authRoutes.signIn.path).toBe('/api/v1/auth/sign-in/email')
    })

    it('has body schema', () => {
      expect(authRoutes.signIn.body).toBeDefined()
    })

    it('has 200 response schema', () => {
      expect(authRoutes.signIn.responses[200]).toBeDefined()
    })
  })

  describe('getSession', () => {
    it('has correct method and path', () => {
      expect(authRoutes.getSession.method).toBe('GET')
      expect(authRoutes.getSession.path).toBe('/api/v1/auth/get-session')
    })

    it('has no body schema', () => {
      expect((authRoutes.getSession as Record<string, unknown>).body).toBeUndefined()
    })

    it('has 200 response schema', () => {
      expect(authRoutes.getSession.responses[200]).toBeDefined()
    })
  })
})
