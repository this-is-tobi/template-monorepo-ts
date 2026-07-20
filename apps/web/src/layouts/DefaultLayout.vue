<script setup lang="ts">
import type { Organization } from 'better-auth/plugins/organization'
import { LogOut, Menu, Moon, PanelLeft, Sun, TriangleAlert, User, X } from 'lucide-vue-next'
import Popover from 'primevue/popover'
import Select from 'primevue/select'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CommandPalette from '~/components/CommandPalette.vue'
import GradientAvatar from '~/components/GradientAvatar.vue'
import SidebarLink from '~/components/SidebarLink.vue'
import { authClient } from '~/lib/auth'
import { adminNav, documentationIcon, mainNav, settingsIcon, settingsNav } from '~/lib/navigation'
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/config'
import { useOrganizationsStore } from '~/stores/organizations'
import { useThemeStore } from '~/stores/theme'

const auth = useAuthStore()
const configStore = useConfigStore()
const themeStore = useThemeStore()
const orgsStore = useOrganizationsStore()
const route = useRoute()
const router = useRouter()

const isAdmin = computed(() => auth.user?.role === 'admin')
const isSettingsRoute = computed(() => route.path.startsWith('/settings'))
const logoUrl = computed(() => themeStore.theme.logoUrl)
const appName = computed(() => configStore.config.appName)
const documentationUrl = computed(() => configStore.config.documentationUrl)
const maintenanceMode = computed(() => configStore.config.maintenanceMode)

const sidebarCollapsed = ref(false)
const mobileSidebarOpen = ref(false)
const userMenu = ref<InstanceType<typeof Popover>>()

// Active organization
const activeOrg = authClient.useActiveOrganization()
const activeOrgId = ref<string | null>(null)

watch(() => activeOrg.value?.data?.id, (id) => {
  activeOrgId.value = id ?? null
})

async function switchOrg(org: Organization | null) {
  if (!org) return
  await authClient.organization.setActive({ organizationId: org.id })
}

// Fetch orgs once the session is available (handles both first mount and late-login).
// Auto-set the first org as active when none is selected yet.
watch(() => auth.isAuthenticated, async (authenticated) => {
  if (!authenticated) return
  await orgsStore.fetchOrganizations()
  // If no active org yet, activate the first one (e.g. personal org)
  if (!activeOrg.value?.data?.id && orgsStore.organizations.length > 0) {
    await authClient.organization.setActive({ organizationId: orgsStore.organizations[0].id })
    activeOrgId.value = orgsStore.organizations[0].id
  } else if (activeOrg.value?.data?.id) {
    activeOrgId.value = activeOrg.value.data.id
  }
}, { immediate: true })

function toggleUserMenu(event: Event) {
  userMenu.value?.toggle(event)
}

function closeMobileSidebar() {
  mobileSidebarOpen.value = false
}

async function handleSignOut() {
  await auth.signOut()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-[var(--app-bg)]">
    <!-- Header -->
    <header class="fixed top-0 inset-x-0 z-30 flex h-12 items-center justify-between border-b border-surface bg-[var(--app-bg)] px-4">
      <div class="flex items-center gap-2">
        <!-- Sidebar toggle -->
        <button
          class="hidden lg:flex h-8 w-8 items-center justify-center rounded text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          aria-label="Toggle sidebar"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          <PanelLeft :size="16" />
        </button>
        <!-- Mobile menu toggle -->
        <button
          class="lg:hidden flex h-8 w-8 items-center justify-center rounded text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          aria-label="Open menu"
          @click="mobileSidebarOpen = true"
        >
          <Menu :size="18" />
        </button>
        <!-- Logo -->
        <RouterLink
          to="/"
          class="flex items-center gap-2 text-sm font-semibold text-[var(--app-fg)]"
        >
          <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="h-5 max-w-[100px] object-contain">
          <span v-else>{{ appName }}</span>
        </RouterLink>
      </div>

      <div class="flex items-center gap-2">
        <!-- Command palette (trigger renders here) -->
        <CommandPalette />

        <!-- User menu -->
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-105"
          aria-label="User menu"
          @click="toggleUserMenu"
        >
          <GradientAvatar :seed="auth.user?.id ?? '?'" :label="auth.user?.name" :size="30" />
        </button>
        <Popover ref="userMenu">
          <div class="flex flex-col w-56">
            <div class="flex items-center gap-2.5 px-3 py-2.5 border-b border-surface">
              <GradientAvatar :seed="auth.user?.id ?? '?'" :label="auth.user?.name" :size="28" />
              <div class="min-w-0">
                <p class="text-sm font-medium text-[var(--app-fg)] truncate">
                  {{ auth.user?.name }}
                </p>
                <p class="text-xs text-[var(--app-muted)] truncate">
                  {{ auth.user?.email }}
                </p>
              </div>
            </div>
            <nav class="py-1">
              <RouterLink
                to="/profile"
                class="flex items-center gap-2 px-3 py-2 text-sm text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                @click="userMenu?.hide()"
              >
                <User :size="14" />
                Profile
              </RouterLink>
            </nav>
            <div class="border-t border-surface py-1">
              <!-- Theme toggle -->
              <button
                class="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                :aria-label="themeStore.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
                @click="themeStore.toggleDarkMode()"
              >
                <Sun v-if="themeStore.isDark" :size="14" />
                <Moon v-else :size="14" />
                {{ themeStore.isDark ? 'Light mode' : 'Dark mode' }}
              </button>
            </div>
            <div class="border-t border-surface py-1">
              <button
                class="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                @click="handleSignOut"
              >
                <LogOut :size="14" />
                Sign out
              </button>
            </div>
          </div>
        </Popover>
      </div>
    </header>

    <!-- Mobile overlay backdrop -->
    <Transition name="fade">
      <div
        v-if="mobileSidebarOpen"
        class="lg:hidden fixed inset-0 z-40 bg-black/50"
        @click="mobileSidebarOpen = false"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="fixed top-12 bottom-0 left-0 z-50 lg:z-20 flex flex-col border-r border-surface bg-[var(--app-bg)] transition-all duration-200 overflow-hidden"
      :class="[
        mobileSidebarOpen ? 'w-60 translate-x-0' : '-translate-x-full lg:translate-x-0',
        sidebarCollapsed ? 'lg:w-0 lg:border-r-0' : 'lg:w-60',
      ]"
    >
      <div class="w-60 flex flex-col h-full">
        <!-- Mobile close -->
        <div class="lg:hidden flex items-center justify-end px-2 py-2">
          <button
            class="flex h-7 w-7 items-center justify-center rounded text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            aria-label="Close menu"
            @click="mobileSidebarOpen = false"
          >
            <X :size="16" />
          </button>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto px-2 py-2 lg:py-4 flex flex-col gap-1">
          <!-- Organization switcher -->
          <div v-if="orgsStore.organizations.length > 0" class="px-1 pb-2 mb-1 border-b border-surface">
            <span class="block text-xs font-semibold uppercase tracking-wider text-[var(--app-muted)] px-2 mb-1.5">Organization</span>
            <Select
              :model-value="orgsStore.organizations.find(o => o.id === activeOrgId) ?? null"
              :options="orgsStore.organizations"
              option-label="name"
              placeholder="Select organization"
              class="w-full"
              size="small"
              @update:model-value="switchOrg"
            />
          </div>

          <!-- Main navigation -->
          <SidebarLink
            v-for="item in mainNav"
            :key="item.to"
            v-bind="item"
            @navigate="closeMobileSidebar"
          />

          <!-- Documentation link -->
          <a
            v-if="documentationUrl"
            :href="documentationUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            @click="closeMobileSidebar"
          >
            <component :is="documentationIcon" :size="16" class="shrink-0" />
            Documentation
          </a>

          <!-- Settings group (admins only) -->
          <template v-if="isAdmin">
            <RouterLink
              to="/settings"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              :class="isSettingsRoute ? 'text-[var(--app-fg)] font-medium' : ''"
              @click="closeMobileSidebar"
            >
              <component :is="settingsIcon" :size="16" class="shrink-0" />
              Settings
            </RouterLink>
            <!-- Settings sub-items -->
            <nav v-if="isSettingsRoute" class="ml-7 flex flex-col gap-0.5">
              <SidebarLink
                v-for="item in settingsNav"
                :key="item.to"
                v-bind="item"
                compact
                @navigate="closeMobileSidebar"
              />
              <!-- Administration section -->
              <div class="mt-2 mb-1 px-3 pt-2 border-t border-surface-200 dark:border-surface-700 text-xs font-semibold uppercase tracking-wider text-[var(--app-muted)]">
                Administration
              </div>
              <SidebarLink
                v-for="item in adminNav"
                :key="item.to"
                v-bind="item"
                compact
                @navigate="closeMobileSidebar"
              />
            </nav>
          </template>
        </nav>
      </div>
    </aside>

    <!-- Maintenance banner (visible to admins) -->
    <div
      v-if="maintenanceMode && isAdmin"
      class="fixed top-12 inset-x-0 z-20 flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-sm font-medium text-white"
    >
      <TriangleAlert :size="14" />
      Maintenance mode is active — non-admin users are blocked.
    </div>

    <!-- Main content -->
    <main
      class="min-h-screen transition-all duration-200"
      :class="[
        sidebarCollapsed ? 'lg:pl-0' : 'lg:pl-60',
        maintenanceMode && isAdmin ? 'pt-[calc(3rem+2.25rem)]' : 'pt-12',
      ]"
    >
      <div class="px-4 py-6 lg:px-8">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
