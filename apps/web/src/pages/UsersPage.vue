<script setup lang="ts">
import type { AdminUser } from '~/stores/admin-users'
import { onMounted, ref } from 'vue'
import { Alert } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Column, DataTable } from '~/components/ui/data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Select } from '~/components/ui/select'
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

function onPage(event: { first: number, rows: number }) {
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
  if (role === 'admin') return 'warning'
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
        <Input
          id="filter-value"
          v-model="filterValue"
          :placeholder="`Search by ${filterField}...`"
          @keyup.enter="applyFilters"
        />
      </div>
      <Button @click="applyFilters">
        Apply
      </Button>
    </div>

    <Alert
      v-if="usersStore.error"
      variant="destructive"
    >
      {{ usersStore.error }}
    </Alert>

    <!-- Bulk action bar -->
    <div
      v-if="selected.length > 0"
      class="flex items-center gap-3 p-3 bg-surface-100 dark:bg-surface-800 rounded-md"
    >
      <span class="text-sm font-medium text-[var(--app-fg)]">{{ selected.length }} selected</span>
      <Button
        variant="outline"
        size="sm"
        class="text-destructive border-destructive/40 hover:bg-destructive/10"
        @click="showBulkBanDialog = true"
      >
        Ban
      </Button>
      <Button
        variant="ghost"
        size="sm"
        @click="selected = []"
      >
        Clear
      </Button>
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
          <Badge :variant="roleSeverity(data.role)">
            {{ data.role ?? 'user' }}
          </Badge>
        </template>
      </Column>
      <Column header="Status">
        <template #body="{ data }">
          <Badge
            v-if="data.banned"
            variant="destructive"
          >
            Banned
          </Badge>
          <Badge
            v-else
            variant="success"
          >
            Active
          </Badge>
        </template>
      </Column>
      <Column header="Created">
        <template #body="{ data }">
          <span class="text-[var(--app-muted)] text-sm">{{ formatDate(data.createdAt) }}</span>
        </template>
      </Column>
    </DataTable>

    <!-- Bulk ban dialog -->
    <Dialog v-model:open="showBulkBanDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Ban selected users</DialogTitle>
        </DialogHeader>
        <p class="text-[var(--app-muted)] mb-4">
          Are you sure you want to ban {{ selected.length }} user(s)?
        </p>
        <div class="flex flex-col gap-2">
          <label
            for="bulk-ban-reason"
            class="text-sm text-[var(--app-muted)]"
          >Reason (optional)</label>
          <Input
            id="bulk-ban-reason"
            v-model="bulkBanReason"
            placeholder="Reason for ban..."
            class="w-full"
          />
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <Button
            variant="secondary"
            @click="showBulkBanDialog = false"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            :loading="usersStore.loading"
            @click="handleBulkBan"
          >
            Ban
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
