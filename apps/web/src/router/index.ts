import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/config'
import { useThemeStore } from '~/stores/theme'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('~/pages/LoginPage.vue'),
      meta: { layout: 'auth', guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('~/pages/RegisterPage.vue'),
      meta: { layout: 'auth', guest: true },
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('~/pages/DashboardPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/organizations',
      name: 'organizations',
      component: () => import('~/pages/OrganizationsPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/organizations/:id',
      name: 'organization-detail',
      component: () => import('~/pages/OrganizationDetailPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/organizations/:id/roles',
      name: 'organization-roles',
      component: () => import('~/pages/OrganizationRolesPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/projects',
      name: 'projects',
      component: () => import('~/pages/ProjectsPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/projects/:id',
      name: 'project-detail',
      component: () => import('~/pages/ProjectDetailPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('~/pages/ProfilePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      component: () => import('~/pages/SettingsPage.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      redirect: { name: 'settings-general' },
      children: [
        {
          path: 'general',
          name: 'settings-general',
          component: () => import('~/components/settings/SettingsGeneral.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'config',
          name: 'settings-config',
          component: () => import('~/components/settings/SettingsConfig.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'theme',
          name: 'settings-theme',
          component: () => import('~/components/settings/SettingsTheme.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'audit',
          name: 'settings-audit',
          component: () => import('~/pages/AuditPage.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'api-keys',
          name: 'settings-api-keys',
          component: () => import('~/pages/ApiKeysPage.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'admin-projects',
          name: 'settings-admin-projects',
          component: () => import('~/pages/ProjectsPage.vue'),
          meta: { requiresAuth: true, requiresAdmin: true, adminMode: true },
        },
        {
          path: 'admin-organizations',
          name: 'settings-admin-organizations',
          component: () => import('~/pages/OrganizationsPage.vue'),
          meta: { requiresAuth: true, requiresAdmin: true, adminMode: true },
        },
        {
          path: 'admin-api-keys',
          name: 'settings-admin-api-keys',
          component: () => import('~/pages/ApiKeysPage.vue'),
          meta: { requiresAuth: true, requiresAdmin: true, adminMode: true },
        },
      ],
    },
    {
      path: '/maintenance',
      name: 'maintenance',
      component: () => import('~/pages/MaintenancePage.vue'),
      meta: { layout: 'auth' },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const configStore = useConfigStore()
  const themeStore = useThemeStore()

  // Load theme + config once — public, no auth needed, non-blocking for UX.
  if (!themeStore.loaded) {
    await themeStore.fetchTheme()
    themeStore.applyDarkMode()
  }

  if (!configStore.loaded) {
    await configStore.fetchConfig()
  }

  if (!auth.loaded) {
    await auth.fetchSession()
  }

  // Block registration page when disabled in app config
  if (to.name === 'register' && !configStore.config.enableRegistration) {
    return { name: 'login' }
  }

  // Maintenance mode — block non-admin authenticated users
  if (configStore.config.maintenanceMode && to.name !== 'maintenance' && to.name !== 'login') {
    if (!auth.isAuthenticated || auth.user?.role !== 'admin') {
      return { name: 'maintenance' }
    }
  }

  // Allow maintenance page to leave when maintenance is off
  if (to.name === 'maintenance' && !configStore.config.maintenanceMode) {
    return { name: 'dashboard' }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.guest && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  if (to.meta.requiresAdmin && auth.user?.role !== 'admin') {
    return { name: 'dashboard' }
  }
})

export default router
