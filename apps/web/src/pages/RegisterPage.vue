<script setup lang="ts">
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/config'

const auth = useAuthStore()
const configStore = useConfigStore()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')

async function handleSubmit() {
  const ok = await auth.signUp(email.value, password.value, name.value)
  if (ok) {
    router.push({ name: 'dashboard' })
  }
}
</script>

<template>
  <Card>
    <template #title>
      Create an account
    </template>
    <template #subtitle>
      Enter your details to get started
    </template>
    <template #content>
      <Message
        v-if="!configStore.config.enableRegistration"
        severity="warn"
      >
        Registration is currently disabled. Please contact an administrator.
      </Message>
      <form
        v-else
        class="flex flex-col gap-4"
        @submit.prevent="handleSubmit"
      >
        <div class="flex flex-col gap-2">
          <label for="name">Name</label>
          <InputText
            id="name"
            v-model="name"
            type="text"
            placeholder="John Doe"
            required
            fluid
          />
        </div>
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
          :label="auth.loading ? 'Creating account...' : 'Create account'"
          :loading="auth.loading"
          fluid
        />
        <p class="text-sm text-[var(--app-muted)] text-center">
          Already have an account?
          <RouterLink
            to="/login"
            class="text-primary hover:underline"
          >
            Sign in
          </RouterLink>
        </p>
      </form>
    </template>
  </Card>
</template>
