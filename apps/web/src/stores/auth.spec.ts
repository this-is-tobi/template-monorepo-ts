import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from './auth'

const { mockGetSession, mockSignInEmail, mockSignUpEmail, mockSignOut, mockSignInOAuth2 } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSignInEmail: vi.fn(),
  mockSignUpEmail: vi.fn(),
  mockSignOut: vi.fn(),
  mockSignInOAuth2: vi.fn(),
}))

vi.mock('~/lib/auth', () => ({
  authClient: {
    getSession: mockGetSession,
    signIn: { email: mockSignInEmail, oauth2: mockSignInOAuth2 },
    signUp: { email: mockSignUpEmail },
    signOut: mockSignOut,
  },
}))

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should start with no user and not loaded', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.loaded).toBe(false)
    expect(store.loading).toBe(false)
    expect(store.isAuthenticated).toBe(false)
  })

  describe('fetchSession', () => {
    it('should set user when session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { user: { id: '1', email: 'test@test.com', name: 'Test' } },
      })
      const store = useAuthStore()
      await store.fetchSession()
      expect(store.user).toEqual({ id: '1', email: 'test@test.com', name: 'Test' })
      expect(store.loaded).toBe(true)
      expect(store.isAuthenticated).toBe(true)
    })

    it('should set user to null when no session', async () => {
      mockGetSession.mockResolvedValue({ data: null })
      const store = useAuthStore()
      await store.fetchSession()
      expect(store.user).toBeNull()
      expect(store.loaded).toBe(true)
      expect(store.isAuthenticated).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      mockGetSession.mockRejectedValue(new Error('Network error'))
      const store = useAuthStore()
      await store.fetchSession()
      expect(store.user).toBeNull()
      expect(store.loaded).toBe(true)
    })
  })

  describe('signIn', () => {
    it('should set user on successful sign in', async () => {
      mockSignInEmail.mockResolvedValue({
        data: { user: { id: '1', email: 'test@test.com', name: 'Test' } },
        error: null,
      })
      const store = useAuthStore()
      const ok = await store.signIn('test@test.com', 'password')
      expect(ok).toBe(true)
      expect(store.user).toEqual({ id: '1', email: 'test@test.com', name: 'Test' })
    })

    it('should set error on auth failure', async () => {
      mockSignInEmail.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      })
      const store = useAuthStore()
      const ok = await store.signIn('test@test.com', 'wrong')
      expect(ok).toBe(false)
      expect(store.error).toBe('Invalid credentials')
    })

    it('should handle network errors', async () => {
      mockSignInEmail.mockRejectedValue(new Error('Network error'))
      const store = useAuthStore()
      const ok = await store.signIn('test@test.com', 'password')
      expect(ok).toBe(false)
      expect(store.error).toBe('Network error')
    })
  })

  describe('signUp', () => {
    it('should set user on successful sign up', async () => {
      mockSignUpEmail.mockResolvedValue({
        data: { user: { id: '2', email: 'new@test.com', name: 'New User' } },
        error: null,
      })
      const store = useAuthStore()
      const ok = await store.signUp('new@test.com', 'password', 'New User')
      expect(ok).toBe(true)
      expect(store.user).toEqual({ id: '2', email: 'new@test.com', name: 'New User' })
    })

    it('should set error on sign up failure', async () => {
      mockSignUpEmail.mockResolvedValue({
        data: null,
        error: { message: 'Email already taken' },
      })
      const store = useAuthStore()
      const ok = await store.signUp('existing@test.com', 'password', 'Test')
      expect(ok).toBe(false)
      expect(store.error).toBe('Email already taken')
    })
  })

  describe('signOut', () => {
    it('should clear user', async () => {
      mockGetSession.mockResolvedValue({
        data: { user: { id: '1', email: 'test@test.com', name: 'Test' } },
      })
      mockSignOut.mockResolvedValue(undefined)
      const store = useAuthStore()
      await store.fetchSession()
      expect(store.isAuthenticated).toBe(true)

      await store.signOut()
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })

    it('should clear user even if signOut throws', async () => {
      mockSignOut.mockRejectedValue(new Error('Network error'))
      const store = useAuthStore()
      store.user = { id: '1', email: 'test@test.com', name: 'Test' }
      await expect(store.signOut()).rejects.toThrow('Network error')
      expect(store.user).toBeNull()
    })
  })

  describe('ssoSignIn', () => {
    it('should call oauth2 signIn with provider', async () => {
      mockSignInOAuth2.mockResolvedValue({})
      const store = useAuthStore()
      await store.ssoSignIn('keycloak')
      expect(mockSignInOAuth2).toHaveBeenCalledWith({
        providerId: 'keycloak',
        callbackURL: `${window.location.origin}/`,
        errorCallbackURL: `${window.location.origin}/login`,
      })
      expect(store.loading).toBe(false)
    })

    it('should set error on SSO failure', async () => {
      mockSignInOAuth2.mockRejectedValue(new Error('SSO unavailable'))
      const store = useAuthStore()
      await store.ssoSignIn('keycloak')
      expect(store.error).toBe('SSO unavailable')
      expect(store.loading).toBe(false)
    })
  })
})
