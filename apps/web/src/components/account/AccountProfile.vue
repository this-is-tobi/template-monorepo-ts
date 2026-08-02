<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import GradientAvatar from '~/components/GradientAvatar.vue'
import RelativeTime from '~/components/RelativeTime.vue'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { useNotify } from '~/composables/useNotify'
import { useAccountStore } from '~/stores/account'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const account = useAccountStore()
const notify = useNotify()

const name = ref('')

// Seed the form from the session, and re-seed if it changes underneath us
// (e.g. another tab updated the profile).
watch(() => auth.user?.name, (value) => { name.value = value ?? '' }, { immediate: true })

const dirty = computed(() => name.value.trim() !== (auth.user?.name ?? '').trim())
const valid = computed(() => name.value.trim().length > 0)

async function save() {
  if (!dirty.value || !valid.value) return
  const ok = await account.updateProfile({ name: name.value.trim() })
  if (ok) notify.success('Profile updated')
  else notify.error(account.error ?? 'Failed to update profile')
}

function reset() {
  name.value = auth.user?.name ?? ''
}
</script>

<template>
  <div class="flex max-w-xl flex-col gap-8">
    <!-- Identity -->
    <section class="flex flex-col gap-4">
      <div class="flex items-center gap-4">
        <GradientAvatar
          :seed="auth.user?.id ?? auth.user?.email ?? 'user'"
          :label="auth.user?.name ?? auth.user?.email"
          :size="56"
        />
        <div class="min-w-0">
          <p class="truncate font-medium text-[var(--app-fg)]">
            {{ auth.user?.name }}
          </p>
          <p class="truncate text-sm text-[var(--app-muted)]">
            {{ auth.user?.email }}
          </p>
        </div>
      </div>
    </section>

    <div class="border-t border-border" />

    <!-- Editable fields -->
    <section class="flex flex-col gap-4">
      <div>
        <h2 class="text-base font-semibold text-[var(--app-fg)]">
          Profile
        </h2>
        <p class="text-sm text-[var(--app-muted)]">
          This name is shown to other members of your organizations.
        </p>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="save">
        <div class="flex flex-col gap-1.5">
          <Label for="account-name">Display name</Label>
          <Input
            id="account-name"
            v-model="name"
            autocomplete="name"
            placeholder="Your name"
            :aria-invalid="!valid"
          />
          <p v-if="!valid" class="text-xs text-[var(--destructive)]">
            Name cannot be empty.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <Button type="submit" size="sm" :disabled="!dirty || !valid || account.loading">
            {{ account.loading ? 'Saving…' : 'Save changes' }}
          </Button>
          <Button
            v-if="dirty"
            type="button"
            variant="ghost"
            size="sm"
            @click="reset"
          >
            Cancel
          </Button>
        </div>
      </form>
    </section>

    <div class="border-t border-border" />

    <!-- Read-only account facts -->
    <section class="flex flex-col gap-3">
      <h2 class="text-base font-semibold text-[var(--app-fg)]">
        Account details
      </h2>
      <dl class="grid grid-cols-[auto_1fr] items-center gap-x-8 gap-y-3">
        <dt class="text-sm text-[var(--app-muted)]">
          Email
        </dt>
        <dd class="text-sm text-[var(--app-fg)]">
          {{ auth.user?.email }}
        </dd>

        <dt class="text-sm text-[var(--app-muted)]">
          Role
        </dt>
        <dd>
          <Badge :variant="auth.isAdmin ? 'warning' : 'secondary'">
            {{ auth.isAdmin ? 'Admin' : 'User' }}
          </Badge>
        </dd>

        <template v-if="auth.user?.createdAt">
          <dt class="text-sm text-[var(--app-muted)]">
            Member since
          </dt>
          <dd class="text-sm text-[var(--app-fg)]">
            <RelativeTime :value="auth.user.createdAt" />
          </dd>
        </template>
      </dl>
    </section>
  </div>
</template>
