<script setup lang="ts">
import type { OrgRole } from '~/stores/roles'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRolesStore } from '~/stores/roles'

/** Available resources and their possible actions — mirrors the API access-control statements. */
const permissionMatrix: Record<string, string[]> = {
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
  project: ['create', 'read', 'update', 'delete'],
  config: ['read', 'update'],
  theme: ['read', 'update'],
  audit: ['read'],
}

const resources = Object.keys(permissionMatrix)

const route = useRoute()
const router = useRouter()
const rolesStore = useRolesStore()

const organizationId = route.params.id as string

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const roleToDelete = ref<OrgRole | null>(null)

const createForm = ref({ name: '', permission: {} as Record<string, string[]> })
const editForm = ref({ id: '', name: '', permission: {} as Record<string, string[]> })

const predefinedRoles = ['owner', 'admin', 'member']

const customRoles = computed(() =>
  rolesStore.roles.filter(r => !predefinedRoles.includes(r.role)),
)

onMounted(() => {
  rolesStore.fetchRoles(organizationId)
})

function openCreate() {
  createForm.value = { name: '', permission: {} }
  showCreateDialog.value = true
}

function openEdit(role: OrgRole) {
  editForm.value = {
    id: role.id,
    name: role.role,
    permission: JSON.parse(JSON.stringify(role.permission)),
  }
  showEditDialog.value = true
}

function openDelete(role: OrgRole) {
  roleToDelete.value = role
  showDeleteDialog.value = true
}

function togglePermission(
  form: { permission: Record<string, string[]> },
  resource: string,
  action: string,
) {
  if (!form.permission[resource]) {
    form.permission[resource] = []
  }
  const actions = form.permission[resource]
  const idx = actions.indexOf(action)
  if (idx === -1) {
    actions.push(action)
  } else {
    actions.splice(idx, 1)
    if (actions.length === 0) {
      delete form.permission[resource]
    }
  }
}

function hasPermission(
  permissions: Record<string, string[]>,
  resource: string,
  action: string,
): boolean {
  return permissions[resource]?.includes(action) ?? false
}

async function handleCreate() {
  const result = await rolesStore.createRole(
    organizationId,
    createForm.value.name,
    createForm.value.permission,
  )
  if (result) showCreateDialog.value = false
}

async function handleEdit() {
  const result = await rolesStore.updateRole(
    organizationId,
    editForm.value.id,
    { permission: editForm.value.permission, roleName: editForm.value.name },
  )
  if (result) showEditDialog.value = false
}

async function handleDelete() {
  if (!roleToDelete.value) return
  const ok = await rolesStore.deleteRole(organizationId, roleToDelete.value.id)
  if (ok) {
    roleToDelete.value = null
    showDeleteDialog.value = false
  }
}

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleString()
}

function permissionCount(permissions: Record<string, string[]>): number {
  return Object.values(permissions).reduce((sum, actions) => sum + actions.length, 0)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2">
          <Button
            label="&larr; Organization"
            text
            size="small"
            @click="router.push({ name: 'organization-detail', params: { id: organizationId } })"
          />
        </div>
        <h1 class="text-3xl font-bold tracking-tight mt-2 text-[var(--app-fg)]">
          Custom roles
        </h1>
        <p class="text-sm text-[var(--app-muted)]">
          Manage custom roles and their permissions for this organization.
        </p>
      </div>
      <Button
        label="Create role"
        @click="openCreate"
      />
    </div>

    <Message
      v-if="rolesStore.error"
      severity="error"
    >
      {{ rolesStore.error }}
    </Message>

    <DataTable
      :value="customRoles"
      striped-rows
    >
      <template #empty>
        No custom roles defined yet.
      </template>
      <Column
        field="role"
        header="Name"
      >
        <template #body="{ data }">
          <span class="font-medium text-[var(--app-fg)]">{{ data.role }}</span>
        </template>
      </Column>
      <Column header="Permissions">
        <template #body="{ data }">
          <Tag
            :value="`${permissionCount(data.permission)} permission${permissionCount(data.permission) !== 1 ? 's' : ''}`"
            severity="info"
          />
        </template>
      </Column>
      <Column header="Created">
        <template #body="{ data }">
          <span class="text-[var(--app-muted)] text-sm">{{ formatDate(data.createdAt) }}</span>
        </template>
      </Column>
      <Column
        header="Actions"
        style="width: 10rem"
      >
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button
              label="Edit"
              text
              size="small"
              @click="openEdit(data)"
            />
            <Button
              label="Delete"
              text
              severity="danger"
              size="small"
              @click="openDelete(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Create role dialog -->
    <Dialog
      v-model:visible="showCreateDialog"
      modal
      header="Create custom role"
      :style="{ width: '36rem' }"
    >
      <form @submit.prevent="handleCreate">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="create-role-name">Role name</label>
            <InputText
              id="create-role-name"
              v-model="createForm.name"
              placeholder="e.g. editor, viewer"
              required
              fluid
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-[var(--app-fg)]">Permissions</label>
            <div class="border border-surface rounded-md overflow-auto max-h-80">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-surface bg-surface-50 dark:bg-surface-900">
                    <th class="text-left px-3 py-2 font-medium text-[var(--app-muted)]">
                      Resource
                    </th>
                    <th
                      v-for="action in ['create', 'read', 'update', 'delete']"
                      :key="action"
                      class="px-3 py-2 font-medium text-[var(--app-muted)] text-center"
                    >
                      {{ action }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="resource in resources"
                    :key="resource"
                    class="border-b border-surface last:border-b-0"
                  >
                    <td class="px-3 py-2 font-medium text-[var(--app-fg)]">
                      {{ resource }}
                    </td>
                    <td
                      v-for="action in ['create', 'read', 'update', 'delete']"
                      :key="action"
                      class="px-3 py-2 text-center"
                    >
                      <Checkbox
                        v-if="permissionMatrix[resource]?.includes(action)"
                        :model-value="hasPermission(createForm.permission, resource, action)"
                        :binary="true"
                        @update:model-value="togglePermission(createForm, resource, action)"
                      />
                      <span
                        v-else
                        class="text-[var(--app-muted)]"
                      >—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <Message
            v-if="rolesStore.error"
            severity="error"
          >
            {{ rolesStore.error }}
          </Message>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            @click="showCreateDialog = false"
          />
          <Button
            type="submit"
            :label="rolesStore.loading ? 'Creating...' : 'Create role'"
            :loading="rolesStore.loading"
          />
        </div>
      </form>
    </Dialog>

    <!-- Edit role dialog -->
    <Dialog
      v-model:visible="showEditDialog"
      modal
      header="Edit role"
      :style="{ width: '36rem' }"
    >
      <form @submit.prevent="handleEdit">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="edit-role-name">Role name</label>
            <InputText
              id="edit-role-name"
              v-model="editForm.name"
              required
              fluid
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-[var(--app-fg)]">Permissions</label>
            <div class="border border-surface rounded-md overflow-auto max-h-80">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-surface bg-surface-50 dark:bg-surface-900">
                    <th class="text-left px-3 py-2 font-medium text-[var(--app-muted)]">
                      Resource
                    </th>
                    <th
                      v-for="action in ['create', 'read', 'update', 'delete']"
                      :key="action"
                      class="px-3 py-2 font-medium text-[var(--app-muted)] text-center"
                    >
                      {{ action }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="resource in resources"
                    :key="resource"
                    class="border-b border-surface last:border-b-0"
                  >
                    <td class="px-3 py-2 font-medium text-[var(--app-fg)]">
                      {{ resource }}
                    </td>
                    <td
                      v-for="action in ['create', 'read', 'update', 'delete']"
                      :key="action"
                      class="px-3 py-2 text-center"
                    >
                      <Checkbox
                        v-if="permissionMatrix[resource]?.includes(action)"
                        :model-value="hasPermission(editForm.permission, resource, action)"
                        :binary="true"
                        @update:model-value="togglePermission(editForm, resource, action)"
                      />
                      <span
                        v-else
                        class="text-[var(--app-muted)]"
                      >—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <Message
            v-if="rolesStore.error"
            severity="error"
          >
            {{ rolesStore.error }}
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
            :label="rolesStore.loading ? 'Saving...' : 'Save changes'"
            :loading="rolesStore.loading"
          />
        </div>
      </form>
    </Dialog>

    <!-- Delete confirmation dialog -->
    <Dialog
      v-model:visible="showDeleteDialog"
      modal
      header="Delete role"
      :style="{ width: '28rem' }"
    >
      <p class="text-[var(--app-muted)] mb-4">
        Are you sure you want to delete the role <strong>{{ roleToDelete?.role }}</strong>?
        Members using this role will lose their custom permissions. This action cannot be undone.
      </p>
      <Message
        v-if="rolesStore.error"
        severity="error"
      >
        {{ rolesStore.error }}
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
          :loading="rolesStore.loading"
          @click="handleDelete"
        />
      </div>
    </Dialog>
  </div>
</template>
