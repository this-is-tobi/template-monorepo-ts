import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountPage } from '~/test/helpers'
import ProjectServiceKeys from './ProjectServiceKeys.vue'

const { mockGet, mockCreate, mockRevoke } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockCreate: vi.fn(),
  mockRevoke: vi.fn(),
}))
const { mockNotify } = vi.hoisted(() => ({
  mockNotify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))
const { mockConfirmRequire } = vi.hoisted(() => ({ mockConfirmRequire: vi.fn() }))

vi.mock('~/composables/useNotify', () => ({ useNotify: () => mockNotify }))
vi.mock('~/composables/useConfirm', () => ({ useConfirm: () => ({ require: mockConfirmRequire }) }))
vi.mock('~/lib/api', () => ({
  apiClient: {
    projects: {
      getServiceKeys: (...a: unknown[]) => mockGet(...a),
      createServiceKey: (...a: unknown[]) => mockCreate(...a),
      revokeServiceKey: (...a: unknown[]) => mockRevoke(...a),
    },
  },
}))

function key(over: Record<string, unknown> = {}) {
  return {
    id: 'key-1',
    name: 'CI deploy',
    start: 'tmts_ab',
    prefix: 'tmts',
    enabled: true,
    permissions: { project: ['read'] },
    lastRequest: null,
    expiresAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

async function mountKeys(keys: ReturnType<typeof key>[] = [], canManage = true) {
  mockGet.mockResolvedValue({ data: { data: keys, total: keys.length } })
  const mounted = await mountPage(ProjectServiceKeys, { props: { projectId: 'proj-1', canManage } })
  await flushPromises()
  return mounted
}

describe('projectServiceKeys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({ data: { key: 'secret-value', data: key() } })
    mockRevoke.mockResolvedValue({})
  })

  describe('listing', () => {
    it('should explain what the section is for when empty', async () => {
      const { wrapper } = await mountKeys([])
      expect(wrapper.text()).toContain('No service keys yet')
    })

    it('should list a key with its permissions', async () => {
      const { wrapper } = await mountKeys([key()])

      expect(wrapper.text()).toContain('CI deploy')
      expect(wrapper.text()).toContain('project:read')
    })

    it('should say a key has never been used rather than showing a dash', async () => {
      // `RelativeTime` renders for real here: the point of the assertion is
      // that the placeholder reaches it, which a stub would swallow.
      mockGet.mockResolvedValue({ data: { data: [key({ lastRequest: null })], total: 1 } })
      const { wrapper } = await mountPage(ProjectServiceKeys, {
        props: { projectId: 'proj-1', canManage: true },
        global: { stubs: { RelativeTime: false } },
      })
      await flushPromises()

      expect(wrapper.text()).toContain('never')
    })

    it('should degrade quietly when the endpoint is unavailable', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))
      const { wrapper } = await mountPage(ProjectServiceKeys, { props: { projectId: 'proj-1', canManage: true } })
      await flushPromises()

      expect(wrapper.text()).toContain('Failed to load service keys')
    })
  })

  describe('read-only viewers', () => {
    it('should hide both mint and revoke', async () => {
      // The server gates on `project:manage-members`; the UI must not offer
      // an action that will only come back 403.
      const { wrapper } = await mountKeys([key()], false)

      expect(wrapper.findAll('button').some(b => b.text().includes('New key'))).toBe(false)
      expect(wrapper.findAll('button').some(b => b.text().includes('Revoke'))).toBe(false)
    })
  })

  describe('revoking', () => {
    it('should confirm before revoking, and say what breaks', async () => {
      const { wrapper } = await mountKeys([key()])

      await wrapper.findAll('button').find(b => b.text().includes('Revoke'))?.trigger('click')

      expect(mockRevoke).not.toHaveBeenCalled()
      expect(mockConfirmRequire).toHaveBeenCalledWith(expect.objectContaining({
        header: 'Revoke this key?',
        message: expect.stringContaining('stops working immediately'),
      }))
    })

    it('should revoke once confirmed', async () => {
      const { wrapper } = await mountKeys([key()])
      await wrapper.findAll('button').find(b => b.text().includes('Revoke'))?.trigger('click')

      await mockConfirmRequire.mock.calls[0]![0].accept()
      await flushPromises()

      expect(mockRevoke).toHaveBeenCalledWith('proj-1', 'key-1')
      expect(mockNotify.success).toHaveBeenCalledWith('Key revoked')
    })
  })
})
