import type { AppConfig } from '@template-monorepo-ts/shared'
import type { MountingOptions } from '@vue/test-utils'
import type { Component } from 'vue'
import type { ApiKeyEntry } from '~/stores/api-keys'
import { AppConfigSchema } from '@template-monorepo-ts/shared'
import { mount, shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

const Stub = { template: '<div />' }

export const testRoutes = [
  { path: '/', name: 'dashboard', component: Stub, meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: Stub, meta: { guest: true, layout: 'auth' } },
  { path: '/register', name: 'register', component: Stub, meta: { guest: true, layout: 'auth' } },
  { path: '/organizations', name: 'organizations', component: Stub, meta: { requiresAuth: true } },
  { path: '/organizations/:id', name: 'organization-detail', component: Stub, meta: { requiresAuth: true } },
  { path: '/projects', name: 'projects', component: Stub, meta: { requiresAuth: true } },
  { path: '/projects/:id', name: 'project-detail', component: Stub, meta: { requiresAuth: true } },
  {
    path: '/account',
    component: Stub,
    redirect: { name: 'account-profile' },
    meta: { requiresAuth: true },
    children: [
      { path: 'profile', name: 'account-profile', component: Stub, meta: { requiresAuth: true } },
      { path: 'security', name: 'account-security', component: Stub, meta: { requiresAuth: true } },
    ],
  },
  {
    path: '/settings',
    name: 'settings',
    component: Stub,
    redirect: { name: 'settings-general' },
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: 'general', name: 'settings-general', component: Stub, meta: { requiresAuth: true, requiresAdmin: true } },
      { path: 'system', name: 'settings-system', component: Stub, meta: { requiresAuth: true, requiresAdmin: true } },
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
  // Mirrors the real component's v-model contract so `setValue()` in specs
  // actually reaches the parent's bound ref.
  Input: { template: '<input :type="type" :placeholder="placeholder" :disabled="disabled" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'type', 'placeholder', 'required', 'minlength', 'maxlength', 'disabled'], emits: ['update:modelValue'] },
  NumberInput: { template: '<input type="number" :disabled="disabled" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value === \'\' ? null : Number($event.target.value))" />', props: ['modelValue', 'min', 'max', 'disabled', 'placeholder'], emits: ['update:modelValue'] },
  Alert: { template: '<div role="alert"><slot /></div>', props: ['variant'] },
  Badge: { template: '<span><slot /></span>', props: ['variant'] },
  // `$props.for` because `for` is a reserved word in a template expression.
  Label: { template: '<label :for="$props.for"><slot /></label>', props: ['for'] },
  Card: { template: '<div class="card"><slot /></div>' },
  CardHeader: { template: '<div><slot /></div>' },
  CardTitle: { template: '<h3><slot /></h3>' },
  CardDescription: { template: '<p><slot /></p>' },
  CardContent: { template: '<div><slot /></div>' },
  CardFooter: { template: '<div><slot /></div>' },
  Checkbox: { template: '<input :id="id" type="checkbox" :disabled="disabled" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />', props: ['modelValue', 'disabled', 'id'], emits: ['update:modelValue'] },
  Switch: { template: '<input :id="id" type="checkbox" role="switch" :disabled="disabled" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />', props: ['modelValue', 'disabled', 'id'], emits: ['update:modelValue'] },
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
  // `to` is rendered as `href` so specs can assert a destination with a plain
  // `a[href="…"]` selector instead of reaching for the component instance.
  RouterLink: { template: '<a :href="to"><slot /></a>', props: ['to'] },
  RouterView: { template: '<div />' },
  // App components rendered inside layouts — expose their labels so
  // text-based assertions keep working under shallowMount.
  SidebarLink: { template: '<a>{{ label }}</a>', props: ['to', 'label', 'icon', 'compact'] },
  CommandPalette: { template: '<button aria-label="Open command palette" />' },
  // Mirrors the real component's sr-only "Loading..." announcement.
  PageSkeleton: { template: '<div role="status">Loading...</div>' },
}

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

  // Merge rather than spread-over: a caller passing one extra stub must not
  // silently drop the whole shared set (pass `{ Name: false }` to render a
  // component for real instead of stubbing it).
  const { stubs: extraStubs, ...restGlobal } = options.global ?? {}

  const wrapper = shallowMount(component as Parameters<typeof shallowMount>[0], {
    props: options.props,
    global: {
      plugins: [pinia, router],
      ...restGlobal,
      stubs: { ...uiStubs, ...extraStubs },
    },
  })

  return { wrapper, router, pinia }
}

/**
 * Mount a component the way the router does — as the component of the active
 * route — so in-component guards actually register.
 *
 * `mountPage` mounts the component directly, which leaves vue-router without a
 * matched record: `onBeforeRouteLeave` / `onBeforeRouteUpdate` bail out with a
 * `VUE_ROUTER_R0020` diagnostic and never run. A spec asserting on a guard has
 * to go through here, otherwise it is asserting on a no-op.
 *
 * Reaching the component through `<RouterView>` means a real mount rather than
 * a shallow one, so child components render unless `uiStubs` (or an extra stub
 * passed by the caller) replaces them.
 *
 * The route table is deliberately minimal — a page to sit on and somewhere to
 * navigate away to — since guard specs only need a departure and a
 * destination. `router` is returned so the spec can trigger the navigation.
 */
export async function mountRoutedPage(
  component: Component,
  options: {
    props?: Record<string, unknown>
    global?: MountingOptions<unknown>['global']
  } = {},
) {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/under-test', name: 'under-test', component },
      { path: '/elsewhere', name: 'elsewhere', component: Stub },
    ],
  })
  await router.push('/under-test')
  await router.isReady()

  const { stubs: extraStubs, ...restGlobal } = options.global ?? {}
  // `RouterView` is the host being mounted here; leaving its stub in place
  // would render an empty div instead of the component under test.
  const { RouterView: _routerViewStub, ...stubs } = uiStubs

  const host = mount(RouterView, {
    global: {
      plugins: [pinia, router],
      ...restGlobal,
      stubs: { ...stubs, ...extraStubs },
    },
  })

  return { wrapper: host.findComponent(component), host, router, pinia }
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

/**
 * A complete `AppConfig`, overridable per test.
 *
 * Built from the schema rather than written out, so adding a platform setting
 * does not break every spec that happens to stub the config store.
 */
export function mockAppConfig(over: Partial<AppConfig> = {}): AppConfig {
  return { ...AppConfigSchema.parse({}), ...over }
}

/**
 * A complete `ApiKeyEntry`, overridable per test.
 *
 * Shared by every spec that reasons about key state — enabled, expiring,
 * unnamed — so a field added to the store's type is back-filled in one place.
 */
export function mockApiKey(over: Partial<ApiKeyEntry> = {}): ApiKeyEntry {
  return {
    id: 'key-1',
    configId: 'config-1',
    name: 'CI deploy key',
    start: 'tmts_ab',
    prefix: 'tmts',
    referenceId: 'user-1',
    permissions: null,
    metadata: null,
    enabled: true,
    expiresAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...over,
  }
}

/** A timestamp `days` from now — for expiry windows measured against `Date.now()`. */
export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}
