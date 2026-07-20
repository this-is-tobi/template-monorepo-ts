import { mockUser } from '~/__mocks__/factories.js'
import { db } from '~/prisma/__mocks__/clients.js'

// Mock dependencies
vi.mock('~/database.js')
vi.mock('~/modules/auth/auth.js', () => ({
  auth: {
    api: {
      createUser: vi.fn().mockResolvedValue({ id: 'new-admin-id', email: 'admin@example.com', role: 'admin' }),
    },
  },
}))

// Use a mutable reference so tests can override config values
const adminConfig = { email: '', password: '' }
vi.mock('~/utils/config.js', () => ({
  config: {
    bootstrap: adminConfig,
    auth: { secret: 'test', baseUrl: 'http://localhost:8081', trustedOrigins: ['http://localhost:3000'], redis: { url: '', sentinelUrls: '', sentinelMaster: 'mymaster', password: '', sentinelPassword: '' }, rateLimit: { enabled: true, window: 10, max: 100 } },
    oidc: { enabled: false, clientId: '', clientSecret: '', issuer: '', publicUrl: '' },
    modules: { auth: true, audit: { enabled: false, retentionDays: 0 } },
  },
}))

const { bootstrapAdmin } = await import('./bootstrap.js')
const { auth } = await import('~/modules/auth/auth.js')

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
}

describe('modules/auth - bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminConfig.email = ''
    adminConfig.password = ''
  })

  it('should skip when admin email is not configured', async () => {
    await bootstrapAdmin(logger)

    expect(db.user.findFirst).not.toHaveBeenCalled()
    expect(auth.api.createUser).not.toHaveBeenCalled()
    expect(logger.info).not.toHaveBeenCalled()
  })

  it('should skip when admin password is not configured', async () => {
    adminConfig.email = 'admin@example.com'

    await bootstrapAdmin(logger)

    expect(db.user.findFirst).not.toHaveBeenCalled()
    expect(auth.api.createUser).not.toHaveBeenCalled()
  })

  it('should skip when admin user already exists and is verified', async () => {
    adminConfig.email = 'admin@example.com'
    adminConfig.password = 'admin'

    const existing = mockUser({ id: 'existing-id', firstname: 'Admin', lastname: '', email: 'admin@example.com', emailVerified: true })
    db.user.findFirst.mockResolvedValueOnce(existing)

    await bootstrapAdmin(logger)

    expect(db.user.findFirst).toHaveBeenCalledWith({ where: { email: 'admin@example.com' } })
    expect(db.user.update).not.toHaveBeenCalled()
    expect(auth.api.createUser).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith('Admin user "admin@example.com" already exists, skipping bootstrap')
  })

  it('should mark an existing unverified admin as emailVerified (heals pre-existing rows for SSO linking)', async () => {
    adminConfig.email = 'admin@example.com'
    adminConfig.password = 'admin'

    const existing = mockUser({ id: 'existing-id', firstname: 'Admin', lastname: '', email: 'admin@example.com', emailVerified: false })
    db.user.findFirst.mockResolvedValueOnce(existing)

    await bootstrapAdmin(logger)

    expect(db.user.update).toHaveBeenCalledWith({ where: { id: 'existing-id' }, data: { emailVerified: true } })
    expect(auth.api.createUser).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith('Admin user "admin@example.com" already exists — marked emailVerified for SSO account linking')
  })

  it('should create admin user when not present', async () => {
    adminConfig.email = 'admin@example.com'
    adminConfig.password = 'secure-password'

    db.user.findFirst.mockResolvedValueOnce(null)

    await bootstrapAdmin(logger)

    expect(db.user.findFirst).toHaveBeenCalledWith({ where: { email: 'admin@example.com' } })
    expect(auth.api.createUser).toHaveBeenCalledWith({
      body: {
        email: 'admin@example.com',
        password: 'secure-password',
        name: 'Admin',
        role: 'admin',
        data: { emailVerified: true },
      },
    })
    expect(logger.info).toHaveBeenCalledWith('Admin user "admin@example.com" created successfully')
  })

  it('should handle race condition (P2002 unique constraint)', async () => {
    adminConfig.email = 'admin@example.com'
    adminConfig.password = 'secure-password'

    db.user.findFirst.mockResolvedValueOnce(null)

    const prismaError = new Error('Unique constraint failed on the fields: (`email`)')
    Object.assign(prismaError, { code: 'P2002' })
    vi.mocked(auth.api.createUser).mockRejectedValueOnce(prismaError)

    await bootstrapAdmin(logger)

    expect(logger.info).toHaveBeenCalledWith('Admin user "admin@example.com" already exists, skipping bootstrap')
  })

  it('should rethrow non-P2002 errors', async () => {
    adminConfig.email = 'admin@example.com'
    adminConfig.password = 'secure-password'

    db.user.findFirst.mockResolvedValueOnce(null)
    vi.mocked(auth.api.createUser).mockRejectedValueOnce(new Error('connection failed'))

    await expect(bootstrapAdmin(logger)).rejects.toThrow('connection failed')
  })
})
