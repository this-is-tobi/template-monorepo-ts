import type { FastifyInstance } from 'fastify'
import { config } from '~/utils/config.js'
import { getRegisteredModules, setupModules } from './index.js'

// Re-mock modules/auth/index.js so the dynamic import resolves to a mock
vi.mock('./auth/index.js', () => {
  const mockAuthModule = {
    default: {
      name: 'auth',
      register: vi.fn(async () => {}),
      onReady: vi.fn(),
      onClose: vi.fn(),
    },
  }
  return mockAuthModule
})

vi.mock('./audit/index.js', () => {
  const mockAuditModule = {
    default: {
      name: 'audit',
      register: vi.fn(async () => {}),
      onReady: vi.fn(),
      onClose: vi.fn(),
    },
  }
  return mockAuditModule
})

/**
 * Create a minimal Fastify-like stub for testing module registration.
 */
function createAppStub(): FastifyInstance {
  return {
    decorate: vi.fn().mockReturnThis(),
    register: vi.fn().mockResolvedValue(undefined),
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn(),
    },
  } as unknown as FastifyInstance
}

describe('module loader (modules/index)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('when auth module is enabled', () => {
    beforeEach(() => {
      vi.spyOn(config.modules, 'auth', 'get').mockReturnValue(true)
    })

    it('should register the auth module', async () => {
      const app = createAppStub()
      await setupModules(app)

      const modules = getRegisteredModules()
      expect(modules).toHaveLength(1)
      expect(modules[0]!.name).toBe('auth')
    })

    it('should call module.register() with the app instance', async () => {
      const app = createAppStub()
      await setupModules(app)

      const modules = getRegisteredModules()
      expect(modules[0]!.register).toHaveBeenCalledWith(app)
    })

    it('should log module registration', async () => {
      const app = createAppStub()
      await setupModules(app)

      expect(app.log.info).toHaveBeenCalledWith('Module "auth" registered')
    })

    it('should freeze the registered modules array', async () => {
      const app = createAppStub()
      await setupModules(app)

      const modules = getRegisteredModules()
      expect(Object.isFrozen(modules)).toBe(true)
    })
  })

  describe('when auth module is disabled', () => {
    beforeEach(() => {
      vi.spyOn(config.modules, 'auth', 'get').mockReturnValue(false)
    })

    it('should not register the auth module', async () => {
      const app = createAppStub()
      await setupModules(app)

      const modules = getRegisteredModules()
      expect(modules).toHaveLength(0)
    })

    it('should decorate app with no-op requireAuth', async () => {
      const app = createAppStub()
      await setupModules(app)

      expect(app.decorate).toHaveBeenCalledWith('requireAuth', expect.any(Function))
    })

    it('should decorate app with no-op requireRole', async () => {
      const app = createAppStub()
      await setupModules(app)

      expect(app.decorate).toHaveBeenCalledWith('requireRole', expect.any(Function))
    })

    it('should log that auth module is disabled', async () => {
      const app = createAppStub()
      await setupModules(app)

      expect(app.log.info).toHaveBeenCalledWith('Auth module disabled — using no-op middleware')
    })

    it('no-op requireRole should return a callable async function', async () => {
      const app = createAppStub()
      await setupModules(app)

      const decorateCalls = (app.decorate as ReturnType<typeof vi.fn>).mock.calls as Array<[string, unknown]>
      const requireRoleCall = decorateCalls.find(([name]) => name === 'requireRole')
      const requireRoleFn = requireRoleCall![1] as (...roles: string[]) => (...args: unknown[]) => Promise<void>
      const handler = requireRoleFn('admin')
      await expect(handler({}, {})).resolves.toBeUndefined()
    })
  })

  describe('when audit module is enabled', () => {
    beforeEach(() => {
      vi.spyOn(config.modules, 'auth', 'get').mockReturnValue(false)
      vi.spyOn(config.modules, 'audit', 'get').mockReturnValue(true)
    })

    it('should register the audit module', async () => {
      const app = createAppStub()
      await setupModules(app)

      const modules = getRegisteredModules()
      expect(modules.some(m => m.name === 'audit')).toBe(true)
    })

    it('should call register() on the audit module', async () => {
      const app = createAppStub()
      await setupModules(app)

      const auditMod = getRegisteredModules().find(m => m.name === 'audit')
      expect(auditMod!.register).toHaveBeenCalledWith(app)
    })
  })
})
