<script setup lang="ts">
import { Laptop, ShieldCheck, ShieldOff } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import QrCode from '~/components/QrCode.vue'
import RelativeTime from '~/components/RelativeTime.vue'
import { Alert } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { useConfirm } from '~/composables/useConfirm'
import { useNotify } from '~/composables/useNotify'
import { useAccountStore } from '~/stores/account'

const account = useAccountStore()
const notify = useNotify()
const confirm = useConfirm()

onMounted(() => account.fetchSessions())

// ── Password ──────────────────────────────────────────────────────────────
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const passwordMismatch = computed(() =>
  confirmPassword.value.length > 0 && newPassword.value !== confirmPassword.value,
)
const canSubmitPassword = computed(() =>
  currentPassword.value.length > 0
  && newPassword.value.length >= 8
  && !passwordMismatch.value,
)

async function submitPassword() {
  if (!canSubmitPassword.value) return
  const ok = await account.changePassword(currentPassword.value, newPassword.value)
  if (ok) {
    notify.success('Password changed — other devices have been signed out')
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    await account.fetchSessions()
  } else {
    notify.error(account.error ?? 'Failed to change password')
  }
}

// ── Two-factor ────────────────────────────────────────────────────────────
const twoFactorDialog = ref(false)
const twoFactorPassword = ref('')
const totpCode = ref('')

/** Enrolment is a two-step flow: password → QR + verify code. */
const enrolmentStep = computed<'password' | 'verify'>(() =>
  account.enrolment ? 'verify' : 'password',
)

function openTwoFactorDialog() {
  twoFactorPassword.value = ''
  totpCode.value = ''
  account.cancelTwoFactorSetup()
  twoFactorDialog.value = true
}

function closeTwoFactorDialog() {
  twoFactorDialog.value = false
  account.cancelTwoFactorSetup()
  twoFactorPassword.value = ''
  totpCode.value = ''
}

async function beginEnrolment() {
  if (!twoFactorPassword.value) return
  const ok = await account.startTwoFactor(twoFactorPassword.value)
  if (!ok) notify.error(account.error ?? 'Failed to start 2FA setup')
}

async function finishEnrolment() {
  if (totpCode.value.length < 6) return
  const ok = await account.confirmTwoFactor(totpCode.value)
  if (ok) {
    notify.success('Two-factor authentication enabled')
    closeTwoFactorDialog()
  } else {
    notify.error(account.error ?? 'Invalid verification code')
  }
}

const disableDialog = ref(false)
const disablePassword = ref('')

async function confirmDisable() {
  const ok = await account.disableTwoFactor(disablePassword.value)
  if (ok) {
    notify.success('Two-factor authentication disabled')
    disableDialog.value = false
    disablePassword.value = ''
  } else {
    notify.error(account.error ?? 'Failed to disable 2FA')
  }
}

// ── Sessions ──────────────────────────────────────────────────────────────
/**
 * Best-effort device label from the UA string. Deliberately coarse — this is
 * a recognition aid ("is that me?"), not analytics.
 */
function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device'
  const browser = /edg/i.test(userAgent)
    ? 'Edge'
    : /chrome|chromium/i.test(userAgent)
      ? 'Chrome'
      : /firefox/i.test(userAgent)
        ? 'Firefox'
        : /safari/i.test(userAgent)
          ? 'Safari'
          : 'Browser'
  const os = /windows/i.test(userAgent)
    ? 'Windows'
    : /mac os|macintosh/i.test(userAgent)
      ? 'macOS'
      : /android/i.test(userAgent)
        ? 'Android'
        : /iphone|ipad|ios/i.test(userAgent)
          ? 'iOS'
          : /linux/i.test(userAgent)
            ? 'Linux'
            : ''
  return os ? `${browser} on ${os}` : browser
}

function revoke(token: string) {
  confirm.require({
    header: 'Revoke session?',
    message: 'That device will be signed out immediately.',
    acceptProps: { label: 'Revoke', severity: 'danger' },
    accept: async () => {
      const ok = await account.revokeSession(token)
      if (ok) notify.success('Session revoked')
      else notify.error(account.error ?? 'Failed to revoke session')
    },
  })
}

function revokeOthers() {
  confirm.require({
    header: 'Sign out all other devices?',
    message: 'Every session except this one will be signed out.',
    acceptProps: { label: 'Sign out others', severity: 'danger' },
    accept: async () => {
      const ok = await account.revokeOtherSessions()
      if (ok) notify.success('Other sessions signed out')
      else notify.error(account.error ?? 'Failed to sign out other sessions')
    },
  })
}
</script>

<template>
  <div class="flex max-w-2xl flex-col gap-8">
    <!-- Password -->
    <section class="flex flex-col gap-4">
      <div>
        <h2 class="text-base font-semibold text-[var(--app-fg)]">
          Password
        </h2>
        <p class="text-sm text-[var(--app-muted)]">
          Changing your password signs out your other devices.
        </p>
      </div>

      <form class="flex max-w-sm flex-col gap-4" @submit.prevent="submitPassword">
        <div class="flex flex-col gap-1.5">
          <Label for="current-password">Current password</Label>
          <Input
            id="current-password"
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="new-password">New password</Label>
          <Input
            id="new-password"
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
          />
          <p class="text-xs text-[var(--app-muted)]">
            At least 8 characters.
          </p>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            :aria-invalid="passwordMismatch"
          />
          <p v-if="passwordMismatch" class="text-xs text-[var(--destructive)]">
            Passwords do not match.
          </p>
        </div>
        <div>
          <Button type="submit" size="sm" :disabled="!canSubmitPassword || account.loading">
            {{ account.loading ? 'Updating…' : 'Update password' }}
          </Button>
        </div>
      </form>
    </section>

    <div class="border-t border-border" />

    <!-- Two-factor -->
    <section class="flex flex-col gap-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="flex items-center gap-2 text-base font-semibold text-[var(--app-fg)]">
            Two-factor authentication
            <Badge :variant="account.twoFactorEnabled ? 'success' : 'secondary'">
              {{ account.twoFactorEnabled ? 'Enabled' : 'Disabled' }}
            </Badge>
          </h2>
          <p class="text-sm text-[var(--app-muted)]">
            Require a code from your authenticator app when signing in.
          </p>
        </div>
        <Button
          v-if="!account.twoFactorEnabled"
          size="sm"
          class="shrink-0"
          @click="openTwoFactorDialog"
        >
          <ShieldCheck :size="15" />
          Enable
        </Button>
        <Button
          v-else
          size="sm"
          variant="outline"
          class="shrink-0"
          @click="disableDialog = true"
        >
          <ShieldOff :size="15" />
          Disable
        </Button>
      </div>
    </section>

    <div class="border-t border-border" />

    <!-- Sessions -->
    <section class="flex flex-col gap-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-base font-semibold text-[var(--app-fg)]">
            Active sessions
          </h2>
          <p class="text-sm text-[var(--app-muted)]">
            Devices currently signed in to your account.
          </p>
        </div>
        <Button
          v-if="account.sessions.length > 1"
          size="sm"
          variant="outline"
          class="shrink-0"
          @click="revokeOthers"
        >
          Sign out others
        </Button>
      </div>

      <p v-if="account.sessionsLoading" class="text-sm text-[var(--app-muted)]">
        Loading sessions…
      </p>
      <p v-else-if="account.sessions.length === 0" class="text-sm text-[var(--app-muted)]">
        No active sessions found.
      </p>
      <ul v-else class="flex flex-col divide-y divide-[var(--app-border)]">
        <li
          v-for="session in account.sessions"
          :key="session.id"
          class="flex items-center justify-between gap-4 py-3"
        >
          <div class="flex min-w-0 items-center gap-3">
            <Laptop :size="18" class="shrink-0 text-[var(--app-muted)]" />
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-[var(--app-fg)]">
                {{ deviceLabel(session.userAgent) }}
              </p>
              <p class="truncate text-xs text-[var(--app-muted)]">
                <span v-if="session.ipAddress">{{ session.ipAddress }} · </span>
                last active <RelativeTime :value="session.updatedAt" />
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            class="shrink-0"
            @click="revoke(session.token)"
          >
            Revoke
          </Button>
        </li>
      </ul>
    </section>

    <!-- 2FA enrolment dialog -->
    <Dialog v-model:open="twoFactorDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enable two-factor authentication</DialogTitle>
          <DialogDescription>
            {{
              enrolmentStep === 'password'
                ? 'Confirm your password to begin setup.'
                : 'Scan the QR code with your authenticator app, then enter the 6-digit code.'
            }}
          </DialogDescription>
        </DialogHeader>

        <!-- Step 1 — confirm password -->
        <div v-if="enrolmentStep === 'password'" class="flex flex-col gap-1.5">
          <Label for="twofactor-password">Password</Label>
          <Input
            id="twofactor-password"
            v-model="twoFactorPassword"
            type="password"
            autocomplete="current-password"
            @keyup.enter="beginEnrolment"
          />
        </div>

        <!-- Step 2 — scan + verify -->
        <div v-else class="flex flex-col gap-4">
          <div class="flex justify-center">
            <QrCode :value="account.enrolment!.totpURI" />
          </div>

          <details class="text-xs text-[var(--app-muted)]">
            <summary class="cursor-pointer select-none">
              Can't scan the code?
            </summary>
            <p class="mt-2 break-all font-mono text-[11px]">
              {{ account.enrolment!.totpURI }}
            </p>
          </details>

          <Alert v-if="account.enrolment!.backupCodes.length" variant="warning">
            <div class="flex flex-col gap-2">
              <p class="font-medium">
                Save your backup codes
              </p>
              <p>These are shown once. Each can be used to sign in if you lose your device.</p>
              <ul class="grid grid-cols-2 gap-x-4 font-mono text-xs">
                <li v-for="code in account.enrolment!.backupCodes" :key="code">
                  {{ code }}
                </li>
              </ul>
            </div>
          </Alert>

          <div class="flex flex-col gap-1.5">
            <Label for="totp-code">Verification code</Label>
            <Input
              id="totp-code"
              v-model="totpCode"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="000000"
              @keyup.enter="finishEnrolment"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" @click="closeTwoFactorDialog">
            Cancel
          </Button>
          <Button
            v-if="enrolmentStep === 'password'"
            size="sm"
            :disabled="!twoFactorPassword || account.loading"
            @click="beginEnrolment"
          >
            Continue
          </Button>
          <Button
            v-else
            size="sm"
            :disabled="totpCode.length < 6 || account.loading"
            @click="finishEnrolment"
          >
            Verify and enable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 2FA disable dialog -->
    <Dialog v-model:open="disableDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable two-factor authentication</DialogTitle>
          <DialogDescription>
            Your account will only be protected by your password.
          </DialogDescription>
        </DialogHeader>
        <div class="flex flex-col gap-1.5">
          <Label for="disable-2fa-password">Password</Label>
          <Input
            id="disable-2fa-password"
            v-model="disablePassword"
            type="password"
            autocomplete="current-password"
            @keyup.enter="confirmDisable"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" @click="disableDialog = false">
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            :disabled="!disablePassword || account.loading"
            @click="confirmDisable"
          >
            Disable 2FA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
