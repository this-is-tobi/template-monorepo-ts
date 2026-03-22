<script setup lang="ts">
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useOrganizationsStore } from '~/stores/organizations'

const route = useRoute()
const router = useRouter()
const organizationsStore = useOrganizationsStore()
const authStore = useAuthStore()

const organizationId = route.params.id as string

const showInviteDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const showRoleDialog = ref(false)
const editForm = ref({ name: '' })
const inviteForm = ref({ email: '', role: 'member' })
const roleForm = ref({ memberId: '', memberName: '', role: '' })

const roleOptions = [
  { label: 'Member', value: 'member' },
  { label: 'Admin', value: 'admin' },
  { label: 'Owner', value: 'owner' },
]

const currentUserMember = computed(() => {
  if (!organizationsStore.currentOrganization || !authStore.user) return null
  return organizationsStore.currentOrganization.members.find(m => m.userId === authStore.user!.id)
})

const isOwnerOrAdmin = computed(() => {
  const role = currentUserMember.value?.role
  return role === 'owner' || role === 'admin'
})

const isOwner = computed(() => currentUserMember.value?.role === 'owner')

const pendingInvitations = computed(() => {
  return organizationsStore.currentOrganization?.invitations.filter(i => i.status === 'pending') ?? []
})

onMounted(() => {
  organizationsStore.fetchOrganization(organizationId)
})

function openEdit() {
  if (!organizationsStore.currentOrganization) return
  editForm.value = { name: organizationsStore.currentOrganization.name }
  showEditDialog.value = true
}

async function handleEdit() {
  const result = await organizationsStore.updateOrganization(organizationId, {
    name: editForm.value.name,
  })
  if (result) showEditDialog.value = false
}

async function handleDelete() {
  const ok = await organizationsStore.deleteOrganization(organizationId)
  if (ok) router.push({ name: 'organizations' })
}

async function handleInvite() {
  const result = await organizationsStore.inviteMember(
    organizationId,
    inviteForm.value.email,
    inviteForm.value.role,
  )
  if (result) {
    inviteForm.value = { email: '', role: 'member' }
    showInviteDialog.value = false
    organizationsStore.fetchOrganization(organizationId)
  }
}

async function handleRemoveMember(memberIdOrUserId: string) {
  await organizationsStore.removeMember(memberIdOrUserId, organizationId)
}

function openRoleDialog(memberId: string, memberName: string, currentRole: string) {
  roleForm.value = { memberId, memberName, role: currentRole }
  showRoleDialog.value = true
}

async function handleRoleUpdate() {
  const ok = await organizationsStore.updateMemberRole(
    roleForm.value.memberId,
    roleForm.value.role,
    organizationId,
  )
  if (ok) showRoleDialog.value = false
}

async function handleCancelInvitation(invitationId: string) {
  await organizationsStore.cancelInvitation(invitationId)
}

function roleSeverity(role: string) {
  if (role === 'owner') return 'danger'
  if (role === 'admin') return 'warn'
  return 'info'
}

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleString()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="organizationsStore.loading && !organizationsStore.currentOrganization">
      <p class="text-[var(--app-muted)]">
        Loading...
      </p>
    </div>

    <div
      v-else-if="organizationsStore.error && !organizationsStore.currentOrganization"
      class="flex flex-col gap-4"
    >
      <Message severity="error">
        {{ organizationsStore.error }}
      </Message>
      <Button
        label="&larr; Organizations"
        outlined
        @click="router.push({ name: 'organizations' })"
      />
    </div>

    <template v-else-if="organizationsStore.currentOrganization">
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2">
            <Button
              label="&larr; Organizations"
              text
              size="small"
              @click="router.push({ name: 'organizations' })"
            />
          </div>
          <h1 class="text-3xl font-bold tracking-tight mt-2 text-[var(--app-fg)]">
            {{ organizationsStore.currentOrganization.name }}
          </h1>
          <p class="text-[var(--app-muted)]">
            {{ organizationsStore.currentOrganization.slug }}
          </p>
        </div>
        <div
          v-if="isOwnerOrAdmin"
          class="flex gap-2"
        >
          <Button
            label="Invite member"
            outlined
            @click="showInviteDialog = true"
          />
          <Button
            label="Edit"
            outlined
            @click="openEdit"
          />
          <Button
            v-if="isOwner"
            label="Delete"
            severity="danger"
            outlined
            @click="showDeleteDialog = true"
          />
        </div>
      </div>

      <!-- Organization details -->
      <Card>
        <template #title>
          Details
        </template>
        <template #content>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-[var(--app-muted)]">
                Name
              </p>
              <p class="font-medium text-[var(--app-fg)]">
                {{ organizationsStore.currentOrganization.name }}
              </p>
            </div>
            <div>
              <p class="text-sm text-[var(--app-muted)]">
                Slug
              </p>
              <p class="font-medium text-[var(--app-fg)]">
                {{ organizationsStore.currentOrganization.slug }}
              </p>
            </div>
            <div>
              <p class="text-sm text-[var(--app-muted)]">
                Created
              </p>
              <p class="font-medium text-[var(--app-fg)]">
                {{ formatDate(organizationsStore.currentOrganization.createdAt) }}
              </p>
            </div>
            <div>
              <p class="text-sm text-[var(--app-muted)]">
                Your role
              </p>
              <Tag
                v-if="currentUserMember"
                :value="currentUserMember.role"
                :severity="roleSeverity(currentUserMember.role)"
              />
              <span v-else class="text-[var(--app-muted)]">—</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- Members -->
      <Card>
        <template #title>
          Members
        </template>
        <template #content>
          <DataTable
            :value="organizationsStore.currentOrganization.members"
            striped-rows
          >
            <template #empty>
              No members.
            </template>
            <Column
              field="user.name"
              header="Name"
            >
              <template #body="{ data }">
                <span class="font-medium text-[var(--app-fg)]">{{ data.user.name }}</span>
              </template>
            </Column>
            <Column
              field="user.email"
              header="Email"
            >
              <template #body="{ data }">
                <span class="text-[var(--app-muted)]">{{ data.user.email }}</span>
              </template>
            </Column>
            <Column
              field="role"
              header="Role"
            >
              <template #body="{ data }">
                <Tag
                  :value="data.role"
                  :severity="roleSeverity(data.role)"
                />
              </template>
            </Column>
            <Column header="Joined">
              <template #body="{ data }">
                <span class="text-[var(--app-muted)]">{{ formatDate(data.createdAt) }}</span>
              </template>
            </Column>
            <Column
              v-if="isOwnerOrAdmin"
              header="Actions"
              style="width: 12rem"
            >
              <template #body="{ data }">
                <div
                  v-if="data.userId !== authStore.user?.id"
                  class="flex gap-2"
                >
                  <Button
                    label="Role"
                    text
                    size="small"
                    @click="openRoleDialog(data.id, data.user.name, data.role)"
                  />
                  <Button
                    label="Remove"
                    text
                    severity="danger"
                    size="small"
                    @click="handleRemoveMember(data.id)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>

      <!-- Pending invitations -->
      <Card v-if="isOwnerOrAdmin && pendingInvitations.length > 0">
        <template #title>
          Pending invitations
        </template>
        <template #content>
          <DataTable
            :value="pendingInvitations"
            striped-rows
          >
            <Column
              field="email"
              header="Email"
            >
              <template #body="{ data }">
                <span class="text-[var(--app-fg)]">{{ data.email }}</span>
              </template>
            </Column>
            <Column
              field="role"
              header="Role"
            >
              <template #body="{ data }">
                <Tag
                  :value="data.role"
                  :severity="roleSeverity(data.role)"
                />
              </template>
            </Column>
            <Column header="Expires">
              <template #body="{ data }">
                <span class="text-[var(--app-muted)]">{{ formatDate(data.expiresAt) }}</span>
              </template>
            </Column>
            <Column
              header="Actions"
              style="width: 8rem"
            >
              <template #body="{ data }">
                <Button
                  label="Cancel"
                  text
                  severity="danger"
                  size="small"
                  @click="handleCancelInvitation(data.id)"
                />
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </template>

    <!-- Invite member dialog -->
    <Dialog
      v-model:visible="showInviteDialog"
      modal
      header="Invite member"
      :style="{ width: '28rem' }"
    >
      <form @submit.prevent="handleInvite">
        <p class="text-[var(--app-muted)] mb-4">
          Send an invitation to join this organization.
        </p>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="invite-email">Email</label>
            <InputText
              id="invite-email"
              v-model="inviteForm.email"
              type="email"
              placeholder="user@example.com"
              required
              fluid
            />
          </div>
          <div class="flex flex-col gap-2">
            <label for="invite-role">Role</label>
            <Select
              id="invite-role"
              v-model="inviteForm.role"
              :options="roleOptions"
              option-label="label"
              option-value="value"
            />
          </div>
          <Message
            v-if="organizationsStore.error"
            severity="error"
          >
            {{ organizationsStore.error }}
          </Message>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            @click="showInviteDialog = false"
          />
          <Button
            type="submit"
            :label="organizationsStore.loading ? 'Inviting...' : 'Send invite'"
            :loading="organizationsStore.loading"
          />
        </div>
      </form>
    </Dialog>

    <!-- Edit dialog -->
    <Dialog
      v-model:visible="showEditDialog"
      modal
      header="Edit organization"
      :style="{ width: '28rem' }"
    >
      <form @submit.prevent="handleEdit">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="detail-edit-name">Name</label>
            <InputText
              id="detail-edit-name"
              v-model="editForm.name"
              required
              minlength="2"
              maxlength="100"
              fluid
            />
          </div>
          <Message
            v-if="organizationsStore.error"
            severity="error"
          >
            {{ organizationsStore.error }}
          </Message>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            @click="showEditDialog = false"
          />
          <Button
            type="submit"
            :label="organizationsStore.loading ? 'Saving...' : 'Save'"
            :loading="organizationsStore.loading"
          />
        </div>
      </form>
    </Dialog>

    <!-- Delete confirmation dialog -->
    <Dialog
      v-model:visible="showDeleteDialog"
      modal
      header="Delete organization"
      :style="{ width: '28rem' }"
    >
      <p class="text-[var(--app-muted)] mb-4">
        Are you sure you want to delete <strong>{{ organizationsStore.currentOrganization?.name }}</strong>?
        This will remove all members and invitations. This action cannot be undone.
      </p>
      <Message
        v-if="organizationsStore.error"
        severity="error"
      >
        {{ organizationsStore.error }}
      </Message>
      <div class="flex justify-end gap-2 mt-6">
        <Button
          type="button"
          label="Cancel"
          severity="secondary"
          @click="showDeleteDialog = false"
        />
        <Button
          label="Delete"
          severity="danger"
          :loading="organizationsStore.loading"
          @click="handleDelete"
        />
      </div>
    </Dialog>

    <!-- Update member role dialog -->
    <Dialog
      v-model:visible="showRoleDialog"
      modal
      header="Update member role"
      :style="{ width: '28rem' }"
    >
      <form @submit.prevent="handleRoleUpdate">
        <p class="text-[var(--app-muted)] mb-4">
          Change role for <strong>{{ roleForm.memberName }}</strong>.
        </p>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="role-select">Role</label>
            <Select
              id="role-select"
              v-model="roleForm.role"
              :options="roleOptions"
              option-label="label"
              option-value="value"
            />
          </div>
          <Message
            v-if="organizationsStore.error"
            severity="error"
          >
            {{ organizationsStore.error }}
          </Message>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            @click="showRoleDialog = false"
          />
          <Button
            type="submit"
            :label="organizationsStore.loading ? 'Updating...' : 'Update role'"
            :loading="organizationsStore.loading"
          />
        </div>
      </form>
    </Dialog>
  </div>
</template>
