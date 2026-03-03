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
    admin: adminConfig,
    auth: { secret: 'test', baseUrl: 'http://localhost:8081', trustedOrigins: ['http://localhost:3000'], redisUrl: '', redisSentinelUrls: '', redisSentinelMaster: 'mymaster', redisPassword: '', redisSentinelPassword: '' },
    keycloak: { enabled: false, clientId: '', clientSecret: '', issuer: '' },
    modules: { auth: true },
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

  it('should skip when admin user already exists', async () => {
    adminConfig.email = 'admin@example.com'
    adminConfig.password = 'admin'

    const existing = mockUser({ id: 'existing-id', firstname: 'Admin', lastname: '', email: 'admin@example.com' })
    db.user.findFirst.mockResolvedValueOnce(existing)

    await bootstrapAdmin(logger)

    expect(db.user.findFirst).toHaveBeenCalledWith({ where: { email: 'admin@example.com' } })
    expect(auth.api.createUser).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith('Admin user "admin@example.com" already exists, skipping bootstrap')
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
      },
    })
    expect(logger.info).toHaveBeenCalledWith('Admin user "admin@example.com" created successfully')
  })
})
