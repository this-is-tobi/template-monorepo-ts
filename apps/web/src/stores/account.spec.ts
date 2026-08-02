import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccountStore } from './account'
import { useAuthStore } from './auth'

const {
  mockListSessions,
  mockRevokeSession,
  mockRevokeOtherSessions,
  mockChangePassword,
  mockUpdateUser,
  mockGetSession,
  mockEnable,
  mockDisable,
  mockVerifyTotp,
} = vi.hoisted(() => ({
  mockListSessions: vi.fn(),
  mockRevokeSession: vi.fn(),
  mockRevokeOtherSessions: vi.fn(),
  mockChangePassword: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockGetSession: vi.fn(),
  mockEnable: vi.fn(),
  mockDisable: vi.fn(),
  mockVerifyTotp: vi.fn(),
}))

vi.mock('~/lib/auth', () => ({
  authClient: {
    listSessions: (...a: unknown[]) => mockListSessions(...a),
    revokeSession: (...a: unknown[]) => mockRevokeSession(...a),
    revokeOtherSessions: (...a: unknown[]) => mockRevokeOtherSessions(...a),
    changePassword: (...a: unknown[]) => mockChangePassword(...a),
    updateUser: (...a: unknown[]) => mockUpdateUser(...a),
    getSession: (...a: unknown[]) => mockGetSession(...a),
    twoFactor: {
      enable: (...a: unknown[]) => mockEnable(...a),
      disable: (...a: unknown[]) => mockDisable(...a),
      verifyTotp: (...a: unknown[]) => mockVerifyTotp(...a),
    },
  },
}))

const session = {
  id: 'session-1',
  token: 'token-1',
  userAgent: 'Mozilla/5.0',
  ipAddress: '127.0.0.1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-02-01T00:00:00.000Z',
}

describe('useAccountStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c', name: 'A' } } })
  })

  describe('fetchSessions', () => {
    it('should populate sessions on success', async () => {
      mockListSessions.mockResolvedValueOnce({ data: [session] })
      const store = useAccountStore()

      await store.fetchSessions()

      expect(store.sessions).toHaveLength(1)
      expect(store.sessions[0]?.token).toBe('token-1')
      expect(store.sessionsLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should surface the error and clear sessions on failure', async () => {
      mockListSessions.mockResolvedValueOnce({ error: { message: 'nope' } })
      const store = useAccountStore()

      await store.fetchSessions()

      expect(store.sessions).toStrictEqual([])
      expect(store.error).toBe('nope')
    })

    it('should not throw when the client rejects', async () => {
      mockListSessions.mockRejectedValueOnce(new Error('offline'))
      const store = useAccountStore()

      await store.fetchSessions()

      expect(store.error).toBe('offline')
      expect(store.sessionsLoading).toBe(false)
    })
  })

  describe('updateProfile', () => {
    it('should refresh the session so auth.user reflects the change', async () => {
      mockUpdateUser.mockResolvedValueOnce({})
      const store = useAccountStore()
      const auth = useAuthStore()
      const spy = vi.spyOn(auth, 'fetchSession')

      const ok = await store.updateProfile({ name: 'New' })

      expect(ok).toBe(true)
      expect(mockUpdateUser).toHaveBeenCalledWith({ name: 'New' })
      expect(spy).toHaveBeenCalled()
    })

    it('should return false and set error on failure', async () => {
      mockUpdateUser.mockResolvedValueOnce({ error: { message: 'bad name' } })
      const store = useAccountStore()

      expect(await store.updateProfile({ name: '' })).toBe(false)
      expect(store.error).toBe('bad name')
    })
  })

  describe('changePassword', () => {
    it('should revoke other sessions by default', async () => {
      mockChangePassword.mockResolvedValueOnce({})
      const store = useAccountStore()

      const ok = await store.changePassword('old', 'newpassword')

      expect(ok).toBe(true)
      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: 'old',
        newPassword: 'newpassword',
        revokeOtherSessions: true,
      })
    })

    it('should allow keeping other sessions', async () => {
      mockChangePassword.mockResolvedValueOnce({})
      const store = useAccountStore()

      await store.changePassword('old', 'newpassword', false)

      expect(mockChangePassword).toHaveBeenCalledWith(expect.objectContaining({ revokeOtherSessions: false }))
    })

    it('should report a wrong current password', async () => {
      mockChangePassword.mockResolvedValueOnce({ error: { message: 'Invalid password' } })
      const store = useAccountStore()

      expect(await store.changePassword('wrong', 'newpassword')).toBe(false)
      expect(store.error).toBe('Invalid password')
    })
  })

  describe('two-factor enrolment', () => {
    it('should expose the TOTP URI and backup codes after starting', async () => {
      mockEnable.mockResolvedValueOnce({ data: { totpURI: 'otpauth://x', backupCodes: ['a', 'b'] } })
      const store = useAccountStore()

      const ok = await store.startTwoFactor('pw')

      expect(ok).toBe(true)
      expect(store.enrolment).toStrictEqual({ totpURI: 'otpauth://x', backupCodes: ['a', 'b'] })
    })

    it('should not set an enrolment when the password is rejected', async () => {
      mockEnable.mockResolvedValueOnce({ error: { message: 'Invalid password' } })
      const store = useAccountStore()

      expect(await store.startTwoFactor('wrong')).toBe(false)
      expect(store.enrolment).toBeNull()
    })

    it('should clear the enrolment once the code is confirmed', async () => {
      mockEnable.mockResolvedValueOnce({ data: { totpURI: 'otpauth://x', backupCodes: [] } })
      mockVerifyTotp.mockResolvedValueOnce({})
      const store = useAccountStore()
      await store.startTwoFactor('pw')

      const ok = await store.confirmTwoFactor('123456')

      expect(ok).toBe(true)
      expect(store.enrolment).toBeNull()
    })

    it('should keep the enrolment open when the code is wrong', async () => {
      mockEnable.mockResolvedValueOnce({ data: { totpURI: 'otpauth://x', backupCodes: [] } })
      mockVerifyTotp.mockResolvedValueOnce({ error: { message: 'Invalid code' } })
      const store = useAccountStore()
      await store.startTwoFactor('pw')

      expect(await store.confirmTwoFactor('000000')).toBe(false)
      expect(store.enrolment).not.toBeNull()
      expect(store.error).toBe('Invalid code')
    })

    it('should discard an in-progress enrolment on cancel', async () => {
      mockEnable.mockResolvedValueOnce({ data: { totpURI: 'otpauth://x', backupCodes: [] } })
      const store = useAccountStore()
      await store.startTwoFactor('pw')

      store.cancelTwoFactorSetup()

      expect(store.enrolment).toBeNull()
    })

    it('should disable two-factor', async () => {
      mockDisable.mockResolvedValueOnce({})
      const store = useAccountStore()

      expect(await store.disableTwoFactor('pw')).toBe(true)
      expect(mockDisable).toHaveBeenCalledWith({ password: 'pw' })
    })
  })

  describe('twoFactorEnabled', () => {
    it('should reflect the flag on the signed-in user', () => {
      const auth = useAuthStore()
      const store = useAccountStore()

      expect(store.twoFactorEnabled).toBe(false)

      auth.user = { id: 'u1', email: 'a@b.c', name: 'A', twoFactorEnabled: true }
      expect(store.twoFactorEnabled).toBe(true)
    })
  })

  describe('session revocation', () => {
    it('should refresh the list after revoking one session', async () => {
      mockRevokeSession.mockResolvedValueOnce({})
      mockListSessions.mockResolvedValueOnce({ data: [] })
      const store = useAccountStore()

      const ok = await store.revokeSession('token-1')

      expect(ok).toBe(true)
      expect(mockRevokeSession).toHaveBeenCalledWith({ token: 'token-1' })
      expect(mockListSessions).toHaveBeenCalled()
    })

    it('should refresh the list after revoking the others', async () => {
      mockRevokeOtherSessions.mockResolvedValueOnce({})
      mockListSessions.mockResolvedValueOnce({ data: [session] })
      const store = useAccountStore()

      expect(await store.revokeOtherSessions()).toBe(true)
      expect(mockListSessions).toHaveBeenCalled()
    })

    it('should report revocation failures', async () => {
      mockRevokeSession.mockResolvedValueOnce({ error: { message: 'forbidden' } })
      const store = useAccountStore()

      expect(await store.revokeSession('token-1')).toBe(false)
      expect(store.error).toBe('forbidden')
    })
  })
})
