import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccountStore } from '~/stores/account'
import { useAuthStore } from '~/stores/auth'
import { mockUser, mountPage } from '~/test/helpers'
import AccountSecurity from './AccountSecurity.vue'

vi.mock('~/lib/auth', () => ({
  authClient: {
    getSession: vi.fn().mockResolvedValue({ data: { user: null } }),
    listSessions: vi.fn().mockResolvedValue({ data: [] }),
    revokeSession: vi.fn().mockResolvedValue({}),
    revokeOtherSessions: vi.fn().mockResolvedValue({}),
    changePassword: vi.fn().mockResolvedValue({}),
    twoFactor: {
      enable: vi.fn().mockResolvedValue({ data: { totpURI: 'otpauth://totp/x?secret=ABC', backupCodes: ['c1', 'c2'] } }),
      disable: vi.fn().mockResolvedValue({}),
      verifyTotp: vi.fn().mockResolvedValue({}),
    },
  },
}))

function session(over: Record<string, unknown> = {}) {
  return {
    id: 's1',
    token: 't1',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/127.0 Safari/537.36',
    ipAddress: '127.0.0.1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-02-01T00:00:00.000Z',
    ...over,
  }
}

async function mountSecurity() {
  const mounted = await mountPage(AccountSecurity)
  const auth = useAuthStore()
  auth.user = { ...mockUser }
  await flushPromises()
  return mounted
}

describe('accountSecurity', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('password', () => {
    it('should keep submit disabled until the form is valid', async () => {
      const { wrapper } = await mountSecurity()
      const submit = wrapper.findAll('button').find(b => b.text().includes('Update password'))
      expect(submit?.attributes('disabled')).toBeDefined()
    })

    it('should warn when the confirmation does not match', async () => {
      const { wrapper } = await mountSecurity()

      await wrapper.find('#current-password').setValue('oldpassword')
      await wrapper.find('#new-password').setValue('newpassword')
      await wrapper.find('#confirm-password').setValue('different')
      await flushPromises()

      expect(wrapper.text()).toContain('Passwords do not match')
    })

    it('should submit a valid password change', async () => {
      const { wrapper } = await mountSecurity()
      const account = useAccountStore()
      account.changePassword = vi.fn().mockResolvedValue(true)

      await wrapper.find('#current-password').setValue('oldpassword')
      await wrapper.find('#new-password').setValue('newpassword')
      await wrapper.find('#confirm-password').setValue('newpassword')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(account.changePassword).toHaveBeenCalledWith('oldpassword', 'newpassword')
    })

    it('should reject a new password shorter than 8 characters', async () => {
      const { wrapper } = await mountSecurity()
      const account = useAccountStore()
      account.changePassword = vi.fn().mockResolvedValue(true)

      await wrapper.find('#current-password').setValue('oldpassword')
      await wrapper.find('#new-password').setValue('short')
      await wrapper.find('#confirm-password').setValue('short')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(account.changePassword).not.toHaveBeenCalled()
    })
  })

  describe('two-factor', () => {
    it('should offer to enable when 2FA is off', async () => {
      const { wrapper } = await mountSecurity()
      expect(wrapper.text()).toContain('Disabled')
      expect(wrapper.findAll('button').some(b => b.text().includes('Enable'))).toBe(true)
    })

    it('should offer to disable when 2FA is on', async () => {
      const { wrapper } = await mountPage(AccountSecurity)
      const auth = useAuthStore()
      auth.user = { ...mockUser, twoFactorEnabled: true }
      await flushPromises()

      expect(wrapper.text()).toContain('Enabled')
      expect(wrapper.findAll('button').some(b => b.text().includes('Disable'))).toBe(true)
    })

    it('should show the QR code and backup codes once enrolment starts', async () => {
      const { wrapper } = await mountSecurity()
      const account = useAccountStore()

      await wrapper.findAll('button').find(b => b.text().includes('Enable'))?.trigger('click')
      await flushPromises()
      await wrapper.find('#twofactor-password').setValue('pw')
      await wrapper.findAll('button').find(b => b.text() === 'Continue')?.trigger('click')
      await flushPromises()

      expect(account.enrolment).not.toBeNull()
      expect(wrapper.text()).toContain('Save your backup codes')
      expect(wrapper.text()).toContain('c1')
      expect(wrapper.findComponent({ name: 'QrCode' }).exists()).toBe(true)
    })
  })

  describe('sessions', () => {
    it('should load sessions on mount', async () => {
      await mountSecurity()
      const { authClient } = await import('~/lib/auth')
      expect(authClient.listSessions).toHaveBeenCalled()
    })

    it('should describe a session by device rather than raw user agent', async () => {
      const { wrapper } = await mountPage(AccountSecurity)
      const account = useAccountStore()
      account.sessions = [session()] as never
      await flushPromises()

      expect(wrapper.text()).toContain('Chrome on macOS')
      expect(wrapper.text()).toContain('127.0.0.1')
      expect(wrapper.text()).not.toContain('AppleWebKit')
    })

    it('should fall back gracefully for an unknown user agent', async () => {
      const { wrapper } = await mountPage(AccountSecurity)
      const account = useAccountStore()
      account.sessions = [session({ userAgent: null })] as never
      await flushPromises()

      expect(wrapper.text()).toContain('Unknown device')
    })

    it('should only offer "sign out others" when more than one session exists', async () => {
      const { wrapper } = await mountPage(AccountSecurity)
      const account = useAccountStore()
      account.sessions = [session()] as never
      await flushPromises()
      expect(wrapper.findAll('button').some(b => b.text().includes('Sign out others'))).toBe(false)

      account.sessions = [session(), session({ id: 's2', token: 't2' })] as never
      await flushPromises()
      expect(wrapper.findAll('button').some(b => b.text().includes('Sign out others'))).toBe(true)
    })

    it('should show an empty state when there are no sessions', async () => {
      const { wrapper } = await mountSecurity()
      expect(wrapper.text()).toContain('No active sessions found')
    })
  })
})
