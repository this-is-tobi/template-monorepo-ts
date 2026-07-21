<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Alert } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
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
    <CardHeader>
      <CardTitle>
        Create an account
      </CardTitle>
      <CardDescription>
        Enter your details to get started
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Alert
        v-if="!configStore.config.enableRegistration"
        variant="warning"
      >
        Registration is currently disabled. Please contact an administrator.
      </Alert>
      <form
        v-else
        class="flex flex-col gap-4"
        @submit.prevent="handleSubmit"
      >
        <div class="flex flex-col gap-2">
          <label for="name">Name</label>
          <Input
            id="name"
            v-model="name"
            type="text"
            placeholder="John Doe"
            required
            class="w-full"
          />
        </div>
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
        <Alert
          v-if="auth.error"
          variant="destructive"
        >
          {{ auth.error }}
        </Alert>
        <Button
          type="submit"
          :loading="auth.loading"
          class="w-full"
        >
          {{ auth.loading ? 'Creating account...' : 'Create account' }}
        </Button>
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
    </CardContent>
  </Card>
</template>
