<script setup lang="ts">
import Button from 'primevue/button'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/config'

const auth = useAuthStore()
const configStore = useConfigStore()
const router = useRouter()

const email = ref('')
const password = ref('')

const ssoProviders = computed(() => configStore.ssoProviders)

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
    <template #title>
      Sign in
    </template>
    <template #subtitle>
      Enter your credentials to access your account
    </template>
    <template #content>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="handleSubmit"
      >
        <div class="flex flex-col gap-2">
          <label for="email">Email</label>
          <InputText
            id="email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            required
            fluid
          />
        </div>
        <div class="flex flex-col gap-2">
          <label for="password">Password</label>
          <InputText
            id="password"
            v-model="password"
            type="password"
            required
            fluid
          />
        </div>
        <Message
          v-if="auth.error"
          severity="error"
        >
          {{ auth.error }}
        </Message>
        <Button
          type="submit"
          :label="auth.loading ? 'Signing in...' : 'Sign in'"
          :loading="auth.loading"
          fluid
        />

        <!-- SSO providers -->
        <template v-if="ssoProviders.length > 0">
          <Divider align="center">
            <span class="text-xs text-[var(--app-muted)]">or</span>
          </Divider>
          <Button
            v-for="provider in ssoProviders"
            :key="provider"
            :label="`Sign in with ${ssoLabels[provider] ?? provider}`"
            severity="secondary"
            outlined
            fluid
            :loading="auth.loading"
            @click="auth.ssoSignIn(provider)"
          />
        </template>

        <p
          v-if="configStore.config.enableRegistration"
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
    </template>
  </Card>
</template>
