import type { FastifyInstance } from 'fastify'

vi.mock('~/database.js')
vi.mock('../auth/auth.js', () => ({
  setAuthAuditLogger: vi.fn(),
}))

const pruneMock = vi.fn().mockResolvedValue(0)
vi.mock('./repository.js', () => ({
  createPrismaAuditRepository: vi.fn().mockImplementation(() => ({
    create: vi.fn(),
    query: vi.fn(),
    count: vi.fn(),
    prune: pruneMock,
  })),
}))

const configMock = { modules: { audit: { enabled: true, retentionDays: 0 } } }
vi.mock('~/utils/config.js', () => ({ config: configMock }))

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

const onReadyContext = {
  app: createAppStub(),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  } as unknown as Parameters<NonNullable<typeof auditModule.onReady>>[0]['logger'],
}

describe('modules/audit - module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pruneMock.mockResolvedValue(0)
    configMock.modules.audit.retentionDays = 0
    vi.useRealTimers()
  })

  afterEach(async () => {
    if (auditModule.onClose) await auditModule.onClose(onReadyContext as never)
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

  describe('onReady', () => {
    it('does nothing when retentionDays <= 0', async () => {
      configMock.modules.audit.retentionDays = 0
      await auditModule.onReady?.(onReadyContext as never)
      expect(pruneMock).not.toHaveBeenCalled()
    })

    it('calls prune at startup when retention is enabled', async () => {
      vi.useFakeTimers()
      configMock.modules.audit.retentionDays = 30
      pruneMock.mockResolvedValueOnce(7)

      await auditModule.onReady?.(onReadyContext as never)

      expect(pruneMock).toHaveBeenCalledTimes(1)
      const cutoff = pruneMock.mock.calls[0][0] as Date
      expect(cutoff).toBeInstanceOf(Date)
      expect(Date.now() - cutoff.getTime()).toBeGreaterThanOrEqual(30 * 86_400_000 - 1)
      expect(onReadyContext.logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ deleted: 7, retentionDays: 30 }),
        expect.stringContaining('pruned old entries'),
      )
    })

    it('schedules a recurring prune every 24h', async () => {
      vi.useFakeTimers()
      configMock.modules.audit.retentionDays = 7
      await auditModule.onReady?.(onReadyContext as never)

      expect(pruneMock).toHaveBeenCalledTimes(1)
      // Resolve the awaited prune that runs inside the interval callback.
      await vi.advanceTimersByTimeAsync(86_400_000)
      expect(pruneMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('onClose', () => {
    it('clears the retention timer scheduled by onReady', async () => {
      vi.useFakeTimers()
      configMock.modules.audit.retentionDays = 1
      await auditModule.onReady?.(onReadyContext as never)
      pruneMock.mockClear()

      await auditModule.onClose?.(onReadyContext as never)
      await vi.advanceTimersByTimeAsync(86_400_000)
      expect(pruneMock).not.toHaveBeenCalled()
    })

    it('is a no-op when no timer was scheduled', async () => {
      await expect(auditModule.onClose?.(onReadyContext as never)).resolves.toBeUndefined()
    })
  })
})
