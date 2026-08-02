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

// Retention is runtime policy now: the sweep reads it from the app config on
// every run rather than from the boot config, so enabling it needs no restart.
const appConfigMock = { auditRetentionDays: 0 }
vi.mock('~/resources/config/queries.js', () => ({
  getConfigQuery: vi.fn(async () => appConfigMock),
}))

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
    appConfigMock.auditRetentionDays = 0
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
    it('does not prune when retention is disabled', async () => {
      appConfigMock.auditRetentionDays = 0
      await auditModule.onReady?.(onReadyContext as never)
      expect(pruneMock).not.toHaveBeenCalled()
    })

    it('still schedules the sweep when retention is disabled, so it can be enabled without a restart', async () => {
      vi.useFakeTimers()
      appConfigMock.auditRetentionDays = 0
      await auditModule.onReady?.(onReadyContext as never)
      expect(pruneMock).not.toHaveBeenCalled()

      appConfigMock.auditRetentionDays = 30
      await vi.advanceTimersByTimeAsync(86_400_000)
      expect(pruneMock).toHaveBeenCalledTimes(1)
    })

    it('keeps the timer alive when a sweep throws', async () => {
      vi.useFakeTimers()
      appConfigMock.auditRetentionDays = 30
      pruneMock.mockRejectedValueOnce(new Error('database unavailable'))

      await auditModule.onReady?.(onReadyContext as never)
      expect(onReadyContext.logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        expect.stringContaining('prune failed'),
      )

      await vi.advanceTimersByTimeAsync(86_400_000)
      expect(pruneMock).toHaveBeenCalledTimes(2)
    })

    it('calls prune at startup when retention is enabled', async () => {
      vi.useFakeTimers()
      appConfigMock.auditRetentionDays = 30
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
      appConfigMock.auditRetentionDays = 7
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
      appConfigMock.auditRetentionDays = 1
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
