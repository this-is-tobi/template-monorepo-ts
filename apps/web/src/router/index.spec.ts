import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/lib/auth', () => ({
  authClient: {
    getSession: vi.fn().mockResolvedValue({ data: null }),
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
  },
}))

vi.mock('@primeuix/themes', () => ({
  updatePreset: vi.fn(),
}))

vi.mock('~/lib/api', () => ({
  apiClient: {
    config: {
      get: vi.fn().mockResolvedValue({ data: { data: { enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false }, ssoProviders: [] } }),
    },
    theme: {
      get: vi.fn().mockResolvedValue({ data: { data: { primaryColor: 'zinc', surfaceColor: 'zinc' } } }),
    },
  },
}))

describe('router', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should define all expected routes', async () => {
    const { default: router } = await import('./index')
    const routeNames = router.getRoutes().map(r => r.name)
    expect(routeNames).toContain('login')
    expect(routeNames).toContain('register')
    expect(routeNames).toContain('dashboard')
    expect(routeNames).toContain('projects')
    expect(routeNames).toContain('project-detail')
    expect(routeNames).toContain('profile')
    expect(routeNames).toContain('settings-general')
    expect(routeNames).toContain('settings-config')
    expect(routeNames).toContain('settings-theme')
  })

  it('should mark auth pages as guest routes', async () => {
    const { default: router } = await import('./index')
    const login = router.getRoutes().find(r => r.name === 'login')
    const register = router.getRoutes().find(r => r.name === 'register')
    expect(login?.meta.guest).toBe(true)
    expect(register?.meta.guest).toBe(true)
  })

  it('should mark app pages as requiresAuth', async () => {
    const { default: router } = await import('./index')
    const dashboard = router.getRoutes().find(r => r.name === 'dashboard')
    const projects = router.getRoutes().find(r => r.name === 'projects')
    const detail = router.getRoutes().find(r => r.name === 'project-detail')
    const profile = router.getRoutes().find(r => r.name === 'profile')
    expect(dashboard?.meta.requiresAuth).toBe(true)
    expect(projects?.meta.requiresAuth).toBe(true)
    expect(detail?.meta.requiresAuth).toBe(true)
    expect(profile?.meta.requiresAuth).toBe(true)
  })

  it('should mark settings routes as requiresAuth and requiresAdmin', async () => {
    const { default: router } = await import('./index')
    for (const name of ['settings-general', 'settings-config', 'settings-theme']) {
      const route = router.getRoutes().find(r => r.name === name)
      expect(route?.meta.requiresAuth).toBe(true)
      expect(route?.meta.requiresAdmin).toBe(true)
    }
  })

  it('should use auth layout for login and register', async () => {
    const { default: router } = await import('./index')
    const login = router.getRoutes().find(r => r.name === 'login')
    const register = router.getRoutes().find(r => r.name === 'register')
    expect(login?.meta.layout).toBe('auth')
    expect(register?.meta.layout).toBe('auth')
  })
})

describe('router navigation guards', () => {
  // Each guard test re-imports a fresh router and stores since vi.mock state is shared.
  // We reset the auth/config/theme store state directly before each navigation.
  const { mockGetSession, mockConfigGet, mockThemeGet } = vi.hoisted(() => ({
    mockGetSession: vi.fn(),
    mockConfigGet: vi.fn(),
    mockThemeGet: vi.fn(),
  }))

  vi.mock('~/lib/auth', () => ({
    authClient: {
      getSession: mockGetSession,
    },
  }))

  vi.mock('~/lib/api', () => ({
    apiClient: {
      config: { get: mockConfigGet },
      theme: { get: mockThemeGet },
    },
  }))

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
    mockGetSession.mockResolvedValue({ data: null })
    mockConfigGet.mockResolvedValue({ data: { data: { enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false } } })
    mockThemeGet.mockResolvedValue({ data: { data: { primaryColor: 'zinc', surfaceColor: 'zinc' } } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should redirect unauthenticated user from protected route to login', async () => {
    mockGetSession.mockResolvedValue({ data: null })
    const { default: router } = await import('./index')
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('should allow authenticated user to access protected route', async () => {
    mockGetSession.mockResolvedValue({ data: { user: { id: '1', role: 'user', email: 'u@test.com' } } })
    const { default: router } = await import('./index')
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('should redirect authenticated user away from guest route to dashboard', async () => {
    mockGetSession.mockResolvedValue({ data: { user: { id: '1', role: 'user', email: 'u@test.com' } } })
    const { default: router } = await import('./index')
    await router.push('/login')
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('should block non-admin from admin route and redirect to dashboard', async () => {
    mockGetSession.mockResolvedValue({ data: { user: { id: '1', role: 'user', email: 'u@test.com' } } })
    const { default: router } = await import('./index')
    await router.push('/settings/general')
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('should allow admin to access settings route', async () => {
    mockGetSession.mockResolvedValue({ data: { user: { id: '1', role: 'admin', email: 'admin@test.com' } } })
    const { default: router } = await import('./index')
    await router.push('/settings/general')
    expect(router.currentRoute.value.name).toBe('settings-general')
  })

  it('should redirect to login when registration is disabled', async () => {
    mockGetSession.mockResolvedValue({ data: null })
    mockConfigGet.mockResolvedValue({ data: { data: { enableRegistration: false, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false } } })
    const { default: router } = await import('./index')
    await router.push('/register')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('should allow register when registration is enabled and user is not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: null })
    mockConfigGet.mockResolvedValue({ data: { data: { enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false } } })
    const { default: router } = await import('./index')
    await router.push('/register')
    expect(router.currentRoute.value.name).toBe('register')
  })
})
