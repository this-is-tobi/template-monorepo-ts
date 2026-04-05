<script setup lang="ts">
import type { PageState } from 'primevue/paginator'
import type { AdminUser } from '~/stores/admin-users'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { onMounted, ref } from 'vue'
import { useAdminUsersStore } from '~/stores/admin-users'

const usersStore = useAdminUsersStore()

const filterField = ref<'name' | 'email' | 'id'>('name')
const filterValue = ref('')
const rows = 20
const first = ref(0)

const searchFieldOptions = [
  { label: 'Name', value: 'name' },
  { label: 'Email', value: 'email' },
  { label: 'ID', value: 'id' },
]

const selected = ref<AdminUser[]>([])
const showBulkBanDialog = ref(false)
const bulkBanReason = ref('')

function loadData() {
  selected.value = []
  usersStore.fetchUsers({
    limit: rows,
    offset: first.value,
    ...(filterValue.value
      ? { searchField: filterField.value, searchValue: filterValue.value }
      : {}),
    sortBy: 'createdAt',
    sortDirection: 'desc',
  })
}

function applyFilters() {
  first.value = 0
  loadData()
}

function onPage(event: PageState) {
  first.value = event.first
  loadData()
}

onMounted(() => {
  loadData()
})

async function handleBulkBan() {
  for (const user of selected.value) {
    if (!user.banned) {
      await usersStore.banUser(user.id, bulkBanReason.value || undefined)
    }
  }
  selected.value = []
  showBulkBanDialog.value = false
  bulkBanReason.value = ''
  loadData()
}

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString()
}

function roleSeverity(role: string | null | undefined) {
  if (role === 'admin') return 'warn'
  return 'info'
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-[var(--app-fg)]">
        All users
      </h1>
      <p class="text-[var(--app-muted)]">
        View and manage all platform users.
      </p>
    </div>

    <!-- Filters -->
    <div class="flex items-end gap-4">
      <div class="flex flex-col gap-1">
        <label
          for="filter-field"
          class="text-sm text-[var(--app-muted)]"
        >Search by</label>
        <Select
          id="filter-field"
          v-model="filterField"
          :options="searchFieldOptions"
          option-label="label"
          option-value="value"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label
          for="filter-value"
          class="text-sm text-[var(--app-muted)]"
        >Search</label>
        <InputText
          id="filter-value"
          v-model="filterValue"
          :placeholder="`Search by ${filterField}...`"
          @keyup.enter="applyFilters"
        />
      </div>
      <Button
        label="Apply"
        @click="applyFilters"
      />
    </div>

    <Message
      v-if="usersStore.error"
      severity="error"
    >
      {{ usersStore.error }}
    </Message>

    <!-- Bulk action bar -->
    <div
      v-if="selected.length > 0"
      class="flex items-center gap-3 p-3 bg-surface-100 dark:bg-surface-800 rounded-md"
    >
      <span class="text-sm font-medium text-[var(--app-fg)]">{{ selected.length }} selected</span>
      <Button
        label="Ban"
        severity="danger"
        size="small"
        outlined
        @click="showBulkBanDialog = true"
      />
      <Button
        label="Clear"
        text
        size="small"
        @click="selected = []"
      />
    </div>

    <DataTable
      v-model:selection="selected"
      :value="usersStore.users"
      :loading="usersStore.loading"
      data-key="id"
      striped-rows
      table-style="min-width: 50rem"
      lazy
      paginator
      :rows="rows"
      :total-records="usersStore.total"
      :first="first"
      @page="onPage"
    >
      <template #empty>
        No users found.
      </template>
      <Column
        selection-mode="multiple"
        header-style="width: 3rem"
      />
      <Column
        field="name"
        header="Name"
      >
        <template #body="{ data }">
          <div class="flex flex-col">
            <router-link
              :to="{ name: 'settings-admin-user-detail', params: { id: data.id } }"
              class="font-medium text-[var(--app-link)] hover:underline"
            >
              {{ data.name }}
            </router-link>
            <span class="text-xs text-[var(--app-muted)] font-mono">{{ data.id }}</span>
          </div>
        </template>
      </Column>
      <Column
        field="email"
        header="Email"
      >
        <template #body="{ data }">
          <a
            :href="`mailto:${data.email}`"
            class="text-[var(--app-link)] hover:underline"
          >{{ data.email }}</a>
        </template>
      </Column>
      <Column
        field="role"
        header="Role"
      >
        <template #body="{ data }">
          <Tag
            :value="data.role ?? 'user'"
            :severity="roleSeverity(data.role)"
          />
        </template>
      </Column>
      <Column header="Status">
        <template #body="{ data }">
          <Tag
            v-if="data.banned"
            value="Banned"
            severity="danger"
          />
          <Tag
            v-else
            value="Active"
            severity="success"
          />
        </template>
      </Column>
      <Column header="Created">
        <template #body="{ data }">
          <span class="text-[var(--app-muted)] text-sm">{{ formatDate(data.createdAt) }}</span>
        </template>
      </Column>
    </DataTable>

    <!-- Bulk ban dialog -->
    <Dialog
      v-model:visible="showBulkBanDialog"
      modal
      header="Ban selected users"
      class="w-full max-w-md"
    >
      <p class="text-[var(--app-muted)] mb-4">
        Are you sure you want to ban {{ selected.length }} user(s)?
      </p>
      <div class="flex flex-col gap-2">
        <label
          for="bulk-ban-reason"
          class="text-sm text-[var(--app-muted)]"
        >Reason (optional)</label>
        <InputText
          id="bulk-ban-reason"
          v-model="bulkBanReason"
          placeholder="Reason for ban..."
          fluid
        />
      </div>
      <div class="flex justify-end gap-2 mt-6">
        <Button
          label="Cancel"
          severity="secondary"
          @click="showBulkBanDialog = false"
        />
        <Button
          label="Ban"
          severity="danger"
          :loading="usersStore.loading"
          @click="handleBulkBan"
        />
      </div>
    </Dialog>
  </div>
</template>
