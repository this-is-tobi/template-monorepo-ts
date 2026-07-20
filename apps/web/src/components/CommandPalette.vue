<script setup lang="ts">
import type { Component } from 'vue'
import { ArrowRightLeft, CornerDownLeft, LogOut, Moon, Plus, Search, Sun, User } from 'lucide-vue-next'
import Dialog from 'primevue/dialog'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { authClient } from '~/lib/auth'
import { adminNav, documentationIcon, mainNav, settingsNav } from '~/lib/navigation'
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/config'
import { useOrganizationsStore } from '~/stores/organizations'
import { useThemeStore } from '~/stores/theme'

/**
 * ⌘K command palette — keyboard-first navigation and actions.
 *
 * Commands are assembled from the shared navigation config plus
 * role-aware actions (org switching, dark mode, sign out). To add a
 * command, push an entry in `commands` below — matching, grouping and
 * keyboard handling come for free.
 */

interface Command {
  id: string
  label: string
  group: string
  icon: Component
  /** Extra keywords to match against (e.g. aliases). */
  keywords?: string
  run: () => void | Promise<void>
}

const open = ref(false)
const query = ref('')
const selectedIndex = ref(0)
const inputEl = ref<HTMLInputElement>()

const router = useRouter()
const auth = useAuthStore()
const themeStore = useThemeStore()
const configStore = useConfigStore()
const orgsStore = useOrganizationsStore()

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
const shortcutHint = isMac ? '⌘K' : 'Ctrl K'

function navigate(to: string) {
  router.push(to)
}

const commands = computed<Command[]>(() => {
  const items: Command[] = []

  // Navigation — from the shared nav config
  for (const nav of mainNav) {
    items.push({ id: `nav:${nav.to}`, label: nav.label, group: 'Navigation', icon: nav.icon, run: () => navigate(nav.to) })
  }
  items.push({ id: 'nav:/profile', label: 'Profile', group: 'Navigation', icon: User, keywords: 'account settings', run: () => navigate('/profile') })
  if (configStore.config.documentationUrl) {
    const url = configStore.config.documentationUrl
    items.push({ id: 'nav:docs', label: 'Documentation', group: 'Navigation', icon: documentationIcon, keywords: 'help docs', run: () => { window.open(url, '_blank', 'noopener') } })
  }

  // Organization switching
  for (const org of orgsStore.organizations) {
    items.push({
      id: `org:${org.id}`,
      label: `Switch to ${org.name}`,
      group: 'Organizations',
      icon: ArrowRightLeft,
      keywords: org.slug,
      run: async () => {
        await authClient.organization.setActive({ organizationId: org.id })
      },
    })
  }

  // Actions
  items.push({
    id: 'action:new-project',
    label: 'New project',
    group: 'Actions',
    icon: Plus,
    keywords: 'create project add',
    run: () => navigate('/projects?new=1'),
  })
  items.push({
    id: 'action:dark-mode',
    label: themeStore.isDark ? 'Switch to light mode' : 'Switch to dark mode',
    group: 'Actions',
    icon: themeStore.isDark ? Sun : Moon,
    keywords: 'theme dark light appearance',
    run: () => themeStore.toggleDarkMode(),
  })
  items.push({
    id: 'action:sign-out',
    label: 'Sign out',
    group: 'Actions',
    icon: LogOut,
    keywords: 'logout',
    run: async () => {
      await auth.signOut()
      router.push({ name: 'login' })
    },
  })

  // Admin — settings & administration
  if (auth.user?.role === 'admin') {
    for (const nav of [...settingsNav, ...adminNav]) {
      items.push({ id: `admin:${nav.to}`, label: nav.label, group: 'Admin', icon: nav.icon, keywords: 'settings admin', run: () => navigate(nav.to) })
    }
  }

  return items
})

/**
 * Case-insensitive subsequence match: every character of the query must
 * appear in order. Contiguous prefixes score higher than scattered hits.
 */
function matchScore(text: string, q: string): number {
  const t = text.toLowerCase()
  if (t.includes(q)) return t.startsWith(q) ? 3 : 2
  let ti = 0
  for (const ch of q) {
    ti = t.indexOf(ch, ti)
    if (ti === -1) return 0
    ti += 1
  }
  return 1
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return commands.value
  return commands.value
    .map(cmd => ({ cmd, score: Math.max(matchScore(cmd.label, q), matchScore(cmd.keywords ?? '', q)) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ cmd }) => cmd)
})

const grouped = computed(() => {
  const groups: { name: string, commands: Command[] }[] = []
  for (const cmd of filtered.value) {
    const group = groups.find(g => g.name === cmd.group)
    if (group) group.commands.push(cmd)
    else groups.push({ name: cmd.group, commands: [cmd] })
  }
  return groups
})

watch([query, open], () => {
  selectedIndex.value = 0
})

function show() {
  open.value = true
  query.value = ''
  nextTick(() => inputEl.value?.focus())
}

function hide() {
  open.value = false
}

async function runCommand(cmd: Command) {
  hide()
  await cmd.run()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, filtered.value.length - 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const cmd = filtered.value[selectedIndex.value]
    if (cmd) runCommand(cmd)
  }
}

function onGlobalKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    if (open.value) hide()
    else show()
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKeydown))

/** Flat index of a command across groups — drives the selection highlight. */
function flatIndex(groupIdx: number, cmdIdx: number): number {
  let index = 0
  for (let g = 0; g < groupIdx; g++) index += grouped.value[g].commands.length
  return index + cmdIdx
}

defineExpose({ show, hide, open })
</script>

<template>
  <!-- Trigger — header search button -->
  <button
    class="flex h-8 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:border-surface-300 dark:hover:border-surface-600 transition-colors"
    aria-label="Open command palette"
    @click="show"
  >
    <Search :size="14" />
    <span class="hidden sm:inline">Search…</span>
    <kbd class="hidden sm:inline rounded border border-[var(--app-border)] bg-[var(--app-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--app-muted)]">{{ shortcutHint }}</kbd>
  </button>

  <Dialog
    v-model:visible="open"
    modal
    dismissable-mask
    :show-header="false"
    position="top"
    class="w-[92vw] max-w-xl !mt-[12vh] overflow-hidden"
    :pt="{ content: { class: '!p-0' } }"
  >
    <div class="flex flex-col" role="combobox" aria-expanded="true" aria-haspopup="listbox" @keydown="onKeydown">
      <!-- Search input -->
      <div class="flex items-center gap-2.5 border-b border-[var(--app-border)] px-4">
        <Search :size="16" class="shrink-0 text-[var(--app-muted)]" />
        <input
          ref="inputEl"
          v-model="query"
          type="text"
          placeholder="Type a command or search…"
          class="h-12 w-full bg-transparent text-sm text-[var(--app-fg)] placeholder-[var(--app-muted)] outline-none"
          aria-label="Search commands"
        >
        <kbd class="shrink-0 rounded border border-[var(--app-border)] px-1.5 py-0.5 text-[10px] text-[var(--app-muted)]">Esc</kbd>
      </div>

      <!-- Results -->
      <div class="max-h-[50vh] overflow-y-auto py-2" role="listbox">
        <p v-if="filtered.length === 0" class="px-4 py-8 text-center text-sm text-[var(--app-muted)]">
          No results for “{{ query }}”
        </p>
        <template v-for="(group, groupIdx) in grouped" :key="group.name">
          <p class="px-4 pt-2 pb-1 text-xs font-medium uppercase tracking-wider text-[var(--app-muted)]">
            {{ group.name }}
          </p>
          <button
            v-for="(cmd, cmdIdx) in group.commands"
            :key="cmd.id"
            class="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
            :class="flatIndex(groupIdx, cmdIdx) === selectedIndex
              ? 'bg-surface-100 dark:bg-surface-800 text-[var(--app-fg)]'
              : 'text-[var(--app-muted)] hover:bg-surface-50 dark:hover:bg-surface-900'"
            role="option"
            :aria-selected="flatIndex(groupIdx, cmdIdx) === selectedIndex"
            @click="runCommand(cmd)"
            @mousemove="selectedIndex = flatIndex(groupIdx, cmdIdx)"
          >
            <component :is="cmd.icon" :size="15" class="shrink-0" />
            <span class="truncate">{{ cmd.label }}</span>
          </button>
        </template>
      </div>

      <!-- Footer hints -->
      <div class="flex items-center gap-4 border-t border-[var(--app-border)] px-4 py-2 text-[11px] text-[var(--app-muted)]">
        <span class="flex items-center gap-1"><kbd class="rounded border border-[var(--app-border)] px-1 py-0.5">↑↓</kbd> Navigate</span>
        <span class="flex items-center gap-1"><CornerDownLeft :size="11" /> Select</span>
      </div>
    </div>
  </Dialog>
</template>
