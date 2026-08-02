<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Alert } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Separator } from '~/components/ui/separator'
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/config'

const auth = useAuthStore()
const configStore = useConfigStore()
const router = useRouter()

const email = ref('')
const password = ref('')

const ssoProviders = computed(() => configStore.ssoProviders)

/**
 * An SSO-only instance has no credentials form at all — the server rejects
 * `sign-in/email` outright, so showing one would be a dead end.
 */
const emailPasswordEnabled = computed(() => configStore.emailPasswordEnabled)

/** Only meaningful as a divider when there is something above it. */
const showSsoDivider = computed(() => emailPasswordEnabled.value && ssoProviders.value.length > 0)

const ssoLabels: Record<string, string> = {
  keycloak: 'Keycloak',
}

async function handleSubmit() {
  const ok = await auth.signIn(email.value, password.value)
  if (ok) {
    router.push({ name: 'dashboard' })
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>
        Sign in
      </CardTitle>
      <CardDescription>
        {{ emailPasswordEnabled ? 'Enter your credentials to access your account' : 'Sign in with your organization account' }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="handleSubmit"
      >
        <template v-if="emailPasswordEnabled">
          <div class="flex flex-col gap-2">
            <label for="email">Email</label>
            <Input
              id="email"
              v-model="email"
              type="email"
              placeholder="you@example.com"
              required
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label for="password">Password</label>
            <Input
              id="password"
              v-model="password"
              type="password"
              required
              class="w-full"
            />
          </div>
        </template>

        <Alert
          v-if="auth.error"
          variant="destructive"
        >
          {{ auth.error }}
        </Alert>

        <Button
          v-if="emailPasswordEnabled"
          type="submit"
          :loading="auth.loading"
          class="w-full"
        >
          {{ auth.loading ? 'Signing in...' : 'Sign in' }}
        </Button>

        <!-- SSO providers -->
        <template v-if="ssoProviders.length > 0">
          <div v-if="showSsoDivider" class="flex items-center gap-3">
            <Separator class="flex-1" />
            <span class="text-xs text-[var(--app-muted)]">or</span>
            <Separator class="flex-1" />
          </div>
          <Button
            v-for="provider in ssoProviders"
            :key="provider"
            variant="outline"
            class="w-full"
            :loading="auth.loading"
            @click="auth.ssoSignIn(provider)"
          >
            Sign in with {{ ssoLabels[provider] ?? provider }}
          </Button>
        </template>

        <!-- Registration creates a local account, so it is moot without one. -->
        <p
          v-if="configStore.config.enableRegistration && emailPasswordEnabled"
          class="text-sm text-[var(--app-muted)] text-center"
        >
          Don't have an account?
          <RouterLink
            to="/register"
            class="text-primary hover:underline"
          >
            Register
          </RouterLink>
        </p>
      </form>
    </CardContent>
  </Card>
</template>
