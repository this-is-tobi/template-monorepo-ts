<script setup lang="ts">
import Popover from 'primevue/popover'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/config'
import { useThemeStore } from '~/stores/theme'

const auth = useAuthStore()
const configStore = useConfigStore()
const themeStore = useThemeStore()
const route = useRoute()
const router = useRouter()

const isAdmin = computed(() => auth.user?.role === 'admin')
const isSettingsRoute = computed(() => route.path.startsWith('/settings'))
const logoUrl = computed(() => themeStore.theme.logoUrl)

const sidebarCollapsed = ref(false)
const mobileSidebarOpen = ref(false)
const userMenu = ref<InstanceType<typeof Popover>>()

function toggleUserMenu(event: Event) {
  userMenu.value?.toggle(event)
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
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 3v18" />
          </svg>
        </button>
        <!-- Mobile menu toggle -->
        <button
          class="lg:hidden flex h-8 w-8 items-center justify-center rounded text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          aria-label="Open menu"
          @click="mobileSidebarOpen = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
        <!-- Logo -->
        <RouterLink
          to="/"
          class="flex items-center gap-2 text-sm font-semibold text-[var(--app-fg)]"
        >
          <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="h-5 max-w-[100px] object-contain">
          <span v-else>TMTS</span>
        </RouterLink>
      </div>

      <div class="flex items-center gap-1">
        <!-- Theme toggle -->
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          :aria-label="themeStore.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="themeStore.toggleDarkMode()"
        >
          <svg v-if="themeStore.isDark" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        </button>
        <!-- User menu -->
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-200 dark:bg-surface-700 text-xs font-medium text-[var(--app-fg)] hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors"
          aria-label="User menu"
          @click="toggleUserMenu"
        >
          {{ auth.user?.name?.charAt(0)?.toUpperCase() ?? '?' }}
        </button>
        <Popover ref="userMenu">
          <div class="flex flex-col w-56">
            <div class="px-3 py-2.5 border-b border-surface">
              <p class="text-sm font-medium text-[var(--app-fg)] truncate">
                {{ auth.user?.name }}
              </p>
              <p class="text-xs text-[var(--app-muted)] truncate">
                {{ auth.user?.email }}
              </p>
            </div>
            <nav class="py-1">
              <RouterLink
                to="/profile"
                class="flex items-center gap-2 px-3 py-2 text-sm text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                @click="userMenu?.hide()"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </RouterLink>
            </nav>
            <div class="border-t border-surface py-1">
              <button
                class="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                @click="handleSignOut"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto px-2 py-2 lg:py-4 flex flex-col gap-1">
          <RouterLink
            to="/"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            active-class="bg-surface-100 dark:bg-surface-800 text-[var(--app-fg)] font-medium"
            @click="mobileSidebarOpen = false"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Dashboard
          </RouterLink>
          <RouterLink
            to="/organizations"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            active-class="bg-surface-100 dark:bg-surface-800 text-[var(--app-fg)] font-medium"
            @click="mobileSidebarOpen = false"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 21a8 8 0 0 0-16 0" />
              <circle cx="10" cy="8" r="5" />
              <path d="M22 20c0-3.37-2.69-6.29-6.44-7.4" />
            </svg>
            Organizations
          </RouterLink>
          <RouterLink
            to="/projects"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            active-class="bg-surface-100 dark:bg-surface-800 text-[var(--app-fg)] font-medium"
            @click="mobileSidebarOpen = false"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Projects
          </RouterLink>
          <!-- Settings group -->
          <template v-if="isAdmin">
            <RouterLink
              to="/settings"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              :class="isSettingsRoute ? 'text-[var(--app-fg)] font-medium' : ''"
              @click="mobileSidebarOpen = false"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Settings
            </RouterLink>
            <!-- Settings sub-items -->
            <nav v-if="isSettingsRoute" class="ml-7 flex flex-col gap-0.5">
              <RouterLink
                to="/settings/general"
                class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                active-class="bg-surface-100 dark:bg-surface-800 text-[var(--app-fg)] font-medium"
                @click="mobileSidebarOpen = false"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                General
              </RouterLink>
              <RouterLink
                to="/settings/config"
                class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                active-class="bg-surface-100 dark:bg-surface-800 text-[var(--app-fg)] font-medium"
                @click="mobileSidebarOpen = false"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 7V4h16v3M9 20h6M12 4v16" />
                </svg>
                Configuration
              </RouterLink>
              <RouterLink
                to="/settings/theme"
                class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                active-class="bg-surface-100 dark:bg-surface-800 text-[var(--app-fg)] font-medium"
                @click="mobileSidebarOpen = false"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                  <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                  <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                  <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                </svg>
                Theme
              </RouterLink>
            </nav>
          </template>
        </nav>
      </div>
    </aside>

    <!-- Main content -->
    <main
      class="min-h-screen pt-12 transition-all duration-200"
      :class="sidebarCollapsed ? 'lg:pl-0' : 'lg:pl-60'"
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
