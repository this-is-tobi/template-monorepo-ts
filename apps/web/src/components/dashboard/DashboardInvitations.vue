<script setup lang="ts">
import { onMounted } from 'vue'
import { Button } from '~/components/ui/button'
import { useNotify } from '~/composables/useNotify'
import { useOrganizationsStore } from '~/stores/organizations'

const organizationsStore = useOrganizationsStore()
const notify = useNotify()

onMounted(() => organizationsStore.fetchUserInvitations())

// Both report what actually happened: the store swallows failures into
// `error`, so an unconditional toast tells someone their invitation was
// accepted while it sits in the list right below, untouched.
async function accept(id: string) {
  if (!await organizationsStore.acceptInvitation(id)) {
    notify.error('Could not accept invitation', organizationsStore.error ?? undefined)
    return
  }
  notify.success('Invitation accepted')
  // The caller just joined an organization — the switcher should show it.
  await organizationsStore.fetchOrganizations()
}

async function decline(id: string) {
  if (!await organizationsStore.rejectInvitation(id)) {
    notify.error('Could not decline invitation', organizationsStore.error ?? undefined)
    return
  }
  notify.info('Invitation declined')
}
</script>

<template>
  <!-- Renders nothing when there is nothing to act on. -->
  <section v-if="organizationsStore.userInvitations.length > 0" class="flex flex-col gap-3">
    <h2 class="text-lg font-semibold text-[var(--app-fg)]">
      Pending invitations
    </h2>
    <ul class="flex flex-col gap-2">
      <li
        v-for="invitation in organizationsStore.userInvitations"
        :key="invitation.id"
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3"
      >
        <div class="min-w-0">
          <p class="truncate font-medium text-[var(--app-fg)]">
            {{ invitation.organizationName }}
          </p>
          <p class="text-sm text-[var(--app-muted)]">
            Invited as <span class="capitalize">{{ invitation.role }}</span>
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <Button size="sm" @click="accept(invitation.id)">
            Accept
          </Button>
          <Button variant="outline" size="sm" @click="decline(invitation.id)">
            Decline
          </Button>
        </div>
      </li>
    </ul>
  </section>
</template>
