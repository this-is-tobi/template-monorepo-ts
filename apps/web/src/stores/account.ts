import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authClient } from '~/lib/auth'
import { useAuthStore } from '~/stores/auth'

/** An active login session for the current user. */
export interface SessionEntry {
  id: string
  token: string
  userAgent: string | null
  ipAddress: string | null
  createdAt: string
  updatedAt: string
  expiresAt: string
}

/** TOTP enrolment payload returned when 2FA is being set up. */
export interface TotpEnrolment {
  totpURI: string
  backupCodes: string[]
}

/**
 * Account self-service — everything a signed-in user can change about their
 * own identity: profile fields, password, two-factor and active sessions.
 *
 * Kept separate from the `auth` store (which owns session *state*) so the
 * whole account area can be dropped without touching sign-in.
 */
export const useAccountStore = defineStore('account', () => {
  const auth = useAuthStore()

  const sessions = ref<SessionEntry[]>([])
  const sessionsLoading = ref(false)
  const enrolment = ref<TotpEnrolment | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** Whether the signed-in user has TOTP enabled. */
  const twoFactorEnabled = computed(() => auth.user?.twoFactorEnabled ?? false)

  /** Normalise BetterAuth's `{ error }` result shape into a thrown-free boolean. */
  function fail(message: string | undefined, fallback: string) {
    error.value = message ?? fallback
    return false
  }

  async function fetchSessions() {
    sessionsLoading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await authClient.listSessions()
      if (fetchError) {
        error.value = fetchError.message ?? 'Failed to load sessions'
        sessions.value = []
      } else {
        sessions.value = (data ?? []) as unknown as SessionEntry[]
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load sessions'
      sessions.value = []
    } finally {
      sessionsLoading.value = false
    }
  }

  async function updateProfile(input: { name?: string, image?: string }) {
    loading.value = true
    error.value = null
    try {
      const { error: updateError } = await authClient.updateUser(input)
      if (updateError) return fail(updateError.message, 'Failed to update profile')
      // Re-read the session so every consumer of `auth.user` sees the change.
      await auth.fetchSession()
      return true
    } catch (e) {
      return fail(e instanceof Error ? e.message : undefined, 'Failed to update profile')
    } finally {
      loading.value = false
    }
  }

  /**
   * Change the password. `revokeOtherSessions` signs out every *other*
   * device — the safe default after a credential change.
   */
  async function changePassword(currentPassword: string, newPassword: string, revokeOtherSessions = true) {
    loading.value = true
    error.value = null
    try {
      const { error: changeError } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions,
      })
      if (changeError) return fail(changeError.message, 'Failed to change password')
      return true
    } catch (e) {
      return fail(e instanceof Error ? e.message : undefined, 'Failed to change password')
    } finally {
      loading.value = false
    }
  }

  /**
   * Start TOTP enrolment. Returns the otpauth URI + backup codes to show the
   * user; 2FA is not active until `confirmTwoFactor` verifies a code.
   */
  async function startTwoFactor(password: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: enableError } = await authClient.twoFactor.enable({ password })
      if (enableError) return fail(enableError.message, 'Failed to start 2FA setup')
      enrolment.value = {
        totpURI: data?.totpURI ?? '',
        backupCodes: data?.backupCodes ?? [],
      }
      return true
    } catch (e) {
      return fail(e instanceof Error ? e.message : undefined, 'Failed to start 2FA setup')
    } finally {
      loading.value = false
    }
  }

  /** Verify the first TOTP code, which activates 2FA on the account. */
  async function confirmTwoFactor(code: string) {
    loading.value = true
    error.value = null
    try {
      const { error: verifyError } = await authClient.twoFactor.verifyTotp({ code })
      if (verifyError) return fail(verifyError.message, 'Invalid verification code')
      enrolment.value = null
      await auth.fetchSession()
      return true
    } catch (e) {
      return fail(e instanceof Error ? e.message : undefined, 'Invalid verification code')
    } finally {
      loading.value = false
    }
  }

  async function disableTwoFactor(password: string) {
    loading.value = true
    error.value = null
    try {
      const { error: disableError } = await authClient.twoFactor.disable({ password })
      if (disableError) return fail(disableError.message, 'Failed to disable 2FA')
      await auth.fetchSession()
      return true
    } catch (e) {
      return fail(e instanceof Error ? e.message : undefined, 'Failed to disable 2FA')
    } finally {
      loading.value = false
    }
  }

  /** Discard an in-progress enrolment (user closed the dialog). */
  function cancelTwoFactorSetup() {
    enrolment.value = null
  }

  async function revokeSession(token: string) {
    error.value = null
    try {
      const { error: revokeError } = await authClient.revokeSession({ token })
      if (revokeError) return fail(revokeError.message, 'Failed to revoke session')
      await fetchSessions()
      return true
    } catch (e) {
      return fail(e instanceof Error ? e.message : undefined, 'Failed to revoke session')
    }
  }

  async function revokeOtherSessions() {
    error.value = null
    try {
      const { error: revokeError } = await authClient.revokeOtherSessions()
      if (revokeError) return fail(revokeError.message, 'Failed to sign out other sessions')
      await fetchSessions()
      return true
    } catch (e) {
      return fail(e instanceof Error ? e.message : undefined, 'Failed to sign out other sessions')
    }
  }

  return {
    sessions,
    sessionsLoading,
    enrolment,
    loading,
    error,
    twoFactorEnabled,
    fetchSessions,
    updateProfile,
    changePassword,
    startTwoFactor,
    confirmTwoFactor,
    disableTwoFactor,
    cancelTwoFactorSetup,
    revokeSession,
    revokeOtherSessions,
  }
})
