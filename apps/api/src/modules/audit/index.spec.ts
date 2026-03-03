import type { FastifyInstance } from 'fastify'

vi.mock('~/database.js')

const auditModule = (await import('./index.js')).default

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

describe('modules/audit - module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have name "audit"', () => {
    expect(auditModule.name).toBe('audit')
  })

  describe('register', () => {
    it('should decorate app with auditLogger', async () => {
      const app = createAppStub()
      await auditModule.register(app)

      expect(app.decorate).toHaveBeenCalledWith('auditLogger', expect.objectContaining({
        log: expect.any(Function),
        logAsync: expect.any(Function),
      }))
    })

    it('should log that the audit module is ready', async () => {
      const app = createAppStub()
      await auditModule.register(app)

      expect(app.log.info).toHaveBeenCalledWith('Audit module — structured audit logging ready')
    })
  })
})
