import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
      get: vi.fn().mockResolvedValue({ data: { data: { enableRegistration: true }, ssoProviders: [] } }),
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
