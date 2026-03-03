import type { FastifyInstance } from 'fastify'

vi.mock('~/database.js')
vi.mock('./bootstrap.js', () => ({
  bootstrapAdmin: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('./middleware.js', () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
}))
vi.mock('./router.js', () => ({
  getAuthRouter: vi.fn().mockReturnValue(vi.fn()),
}))

const authModule = (await import('./index.js')).default
const { bootstrapAdmin } = await import('./bootstrap.js')

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

describe('modules/auth - module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('register', () => {
    it('should decorate app with requireAuth', async () => {
      const app = createAppStub()
      await authModule.register(app)

      expect(app.decorate).toHaveBeenCalledWith('requireAuth', expect.any(Function))
    })

    it('should decorate app with requireRole', async () => {
      const app = createAppStub()
      await authModule.register(app)

      expect(app.decorate).toHaveBeenCalledWith('requireRole', expect.any(Function))
    })

    it('should register the auth router', async () => {
      const app = createAppStub()
      await authModule.register(app)

      expect(app.register).toHaveBeenCalledTimes(1)
    })
  })

  describe('onReady', () => {
    it('should call bootstrapAdmin with the logger', async () => {
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), fatal: vi.fn(), trace: vi.fn(), child: vi.fn(), level: 'info' as const, silent: vi.fn() }
      await authModule.onReady?.({ logger })

      expect(bootstrapAdmin).toHaveBeenCalledWith(logger)
    })
  })
})
