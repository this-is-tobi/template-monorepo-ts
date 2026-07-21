import type { MountingOptions } from '@vue/test-utils'
import type { Component } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

const Stub = { template: '<div />' }

export const testRoutes = [
  { path: '/', name: 'dashboard', component: Stub, meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: Stub, meta: { guest: true, layout: 'auth' } },
  { path: '/register', name: 'register', component: Stub, meta: { guest: true, layout: 'auth' } },
  { path: '/organizations', name: 'organizations', component: Stub, meta: { requiresAuth: true } },
  { path: '/organizations/:id', name: 'organization-detail', component: Stub, meta: { requiresAuth: true } },
  { path: '/projects', name: 'projects', component: Stub, meta: { requiresAuth: true } },
  { path: '/projects/:id', name: 'project-detail', component: Stub, meta: { requiresAuth: true } },
  { path: '/profile', name: 'profile', component: Stub, meta: { requiresAuth: true } },
  {
    path: '/settings',
    name: 'settings',
    component: Stub,
    redirect: { name: 'settings-general' },
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: 'general', name: 'settings-general', component: Stub, meta: { requiresAuth: true, requiresAdmin: true } },
      { path: 'config', name: 'settings-config', component: Stub, meta: { requiresAuth: true, requiresAdmin: true } },
      { path: 'theme', name: 'settings-theme', component: Stub, meta: { requiresAuth: true, requiresAdmin: true } },
      { path: 'audit', name: 'settings-audit', component: Stub, meta: { requiresAuth: true, requiresAdmin: true } },
      { path: 'admin/projects', name: 'settings-admin-projects', component: Stub, meta: { requiresAuth: true, requiresAdmin: true, adminMode: true } },
      { path: 'admin/projects/:id', name: 'settings-admin-project-detail', component: Stub, meta: { requiresAuth: true, requiresAdmin: true } },
      { path: 'admin/organizations', name: 'settings-admin-organizations', component: Stub, meta: { requiresAuth: true, requiresAdmin: true, adminMode: true } },
      { path: 'admin/organizations/:id', name: 'settings-admin-organization-detail', component: Stub, meta: { requiresAuth: true, requiresAdmin: true } },
      { path: 'admin/api-keys', name: 'settings-admin-api-keys', component: Stub, meta: { requiresAuth: true, requiresAdmin: true, adminMode: true } },
      { path: 'admin/api-keys/:id', name: 'settings-admin-api-key-detail', component: Stub, meta: { requiresAuth: true, requiresAdmin: true } },
      { path: 'admin/users', name: 'settings-admin-users', component: Stub, meta: { requiresAuth: true, requiresAdmin: true, adminMode: true } },
      { path: 'admin/users/:id', name: 'settings-admin-user-detail', component: Stub, meta: { requiresAuth: true, requiresAdmin: true } },
    ],
  },
  { path: '/api-keys', name: 'api-keys', component: Stub, meta: { requiresAuth: true } },
  { path: '/api-keys/:id', name: 'api-key-detail', component: Stub, meta: { requiresAuth: true } },
  { path: '/maintenance', name: 'maintenance', component: Stub, meta: { layout: 'auth' } },
]

/**
 * Lightweight stubs for the vendored ui components so slot text renders and
 * assertions on `wrapper.text()` keep working under shallowMount.
 */
export const uiStubs = {
  Button: { template: '<button :type="type" :disabled="loading || disabled"><slot /></button>', props: ['loading', 'disabled', 'type', 'variant', 'size'] },
  Input: { template: '<input :type="type" :placeholder="placeholder" />', props: ['modelValue', 'type', 'placeholder', 'required', 'minlength', 'maxlength', 'disabled'] },
  NumberInput: { template: '<input type="number" />', props: ['modelValue', 'min', 'max', 'disabled', 'placeholder'] },
  Alert: { template: '<div role="alert"><slot /></div>', props: ['variant'] },
  Badge: { template: '<span><slot /></span>', props: ['variant'] },
  Card: { template: '<div class="card"><slot /></div>' },
  CardHeader: { template: '<div><slot /></div>' },
  CardTitle: { template: '<h3><slot /></h3>' },
  CardDescription: { template: '<p><slot /></p>' },
  CardContent: { template: '<div><slot /></div>' },
  CardFooter: { template: '<div><slot /></div>' },
  Checkbox: { template: '<input type="checkbox" />', props: ['modelValue', 'disabled', 'id'] },
  Switch: { template: '<input type="checkbox" role="switch" />', props: ['modelValue', 'disabled', 'id'] },
  Dialog: { template: '<div v-if="open"><slot /></div>', props: ['open'], emits: ['update:open'] },
  DialogContent: { template: '<div><slot /></div>' },
  DialogHeader: { template: '<div><slot /></div>' },
  DialogTitle: { template: '<h2><slot /></h2>' },
  DialogDescription: { template: '<p><slot /></p>' },
  DialogFooter: { template: '<div><slot /></div>' },
  DataTable: { template: '<div><slot v-if="!value || value.length === 0" name="empty" /><slot /></div>', props: ['value', 'stripedRows', 'tableStyle', 'lazy', 'paginator', 'rows', 'totalRecords', 'first', 'loading', 'dataKey', 'selection'] },
  Column: { template: '<div />', props: ['field', 'header', 'style', 'selectionMode', 'headerStyle'] },
  Pagination: { template: '<nav />', props: ['first', 'rows', 'total'] },
  Separator: { template: '<hr />', props: ['orientation'] },
  Select: { template: '<select><slot /></select>', props: ['modelValue', 'options', 'optionLabel', 'optionValue', 'placeholder', 'disabled', 'id'] },
  MultiSelect: { template: '<select multiple><slot /></select>', props: ['modelValue', 'options', 'optionLabel', 'optionValue', 'placeholder', 'disabled', 'id'] },
  Textarea: { template: '<textarea />', props: ['modelValue', 'rows', 'placeholder', 'disabled'] },
  Tabs: { template: '<div><slot /></div>', props: ['defaultValue', 'modelValue'] },
  TabsList: { template: '<div><slot /></div>' },
  TabsTrigger: { template: '<button type="button"><slot /></button>', props: ['value', 'disabled'] },
  TabsContent: { template: '<div><slot /></div>', props: ['value'] },
  Popover: { template: '<div><slot /></div>', props: ['open'] },
  PopoverTrigger: { template: '<button type="button"><slot /></button>' },
  PopoverContent: { template: '<div><slot /></div>', props: ['align', 'sideOffset'] },
  Skeleton: { template: '<div class="skeleton" />' },
  Toaster: { template: '<div />' },
  ConfirmDialogHost: { template: '<div />' },
  RouterLink: { template: '<a><slot /></a>' },
  RouterView: { template: '<div />' },
  // App components rendered inside layouts — expose their labels so
  // text-based assertions keep working under shallowMount.
  SidebarLink: { template: '<a>{{ label }}</a>', props: ['to', 'label', 'icon', 'compact'] },
  CommandPalette: { template: '<button aria-label="Open command palette" />' },
  // Mirrors the real component's sr-only "Loading..." announcement.
  PageSkeleton: { template: '<div role="status">Loading...</div>' },
}

/** @deprecated legacy alias — kept so older specs importing it keep working. */
export const primevueStubs = uiStubs

export function createTestRouter(initialRoute = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: testRoutes,
  })
  router.push(initialRoute)
  return router
}

export async function mountPage(
  component: Component,
  options: {
    route?: string
    props?: Record<string, unknown>
    global?: MountingOptions<unknown>['global']
  } = {},
) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createTestRouter(options.route)
  await router.isReady()

  const wrapper = shallowMount(component as Parameters<typeof shallowMount>[0], {
    props: options.props,
    global: {
      plugins: [pinia, router],
      stubs: uiStubs,
      ...options.global,
    },
  })

  return { wrapper, router, pinia }
}

export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
}

export const mockAdminUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin',
}

export const mockProject = {
  id: 'project-1',
  name: 'Test Project',
  description: 'A test project',
  ownerId: 'user-1',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
}
