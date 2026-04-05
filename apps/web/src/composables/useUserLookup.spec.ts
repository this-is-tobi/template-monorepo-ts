import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserLookup } from './useUserLookup'

const mockListUsers = vi.fn()

vi.mock('~/lib/auth', () => ({
  authClient: {
    admin: {
      listUsers: (...args: unknown[]) => mockListUsers(...args),
    },
  },
}))

describe('useUserLookup', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should return the raw id when user is not cached', () => {
    const lookup = useUserLookup()
    expect(lookup.getUserName('unknown-id')).toBe('unknown-id')
    expect(lookup.getUser('unknown-id')).toBeUndefined()
  })

  it('should populate cache from an existing user list', () => {
    const lookup = useUserLookup()
    lookup.populateFrom([
      { id: 'u-1', name: 'Alice', email: 'a@b.com' },
      { id: 'u-2', name: 'Bob', email: 'b@b.com', image: 'pic.png' },
    ])
    expect(lookup.getUserName('u-1')).toBe('Alice')
    expect(lookup.getUserEmail('u-1')).toBe('a@b.com')
    expect(lookup.getUser('u-2')?.image).toBe('pic.png')
  })

  it('should resolve users from the admin API', async () => {
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          { id: 'u-1', name: 'Alice', email: 'a@b.com', image: null },
          { id: 'u-2', name: 'Bob', email: 'b@b.com', image: null },
        ],
      },
    })

    const lookup = useUserLookup()
    await lookup.resolveUsers(['u-1', 'u-2'])

    expect(lookup.getUserName('u-1')).toBe('Alice')
    expect(lookup.getUserName('u-2')).toBe('Bob')
    expect(mockListUsers).toHaveBeenCalledTimes(1)
  })

  it('should not re-fetch already cached users', async () => {
    mockListUsers.mockResolvedValue({ data: { users: [] } })

    const lookup = useUserLookup()
    lookup.populateFrom([{ id: 'u-1', name: 'Alice', email: 'a@b.com' }])

    await lookup.resolveUsers(['u-1'])
    expect(mockListUsers).not.toHaveBeenCalled()
  })

  it('should handle API errors gracefully', async () => {
    mockListUsers.mockRejectedValue(new Error('Network error'))

    const lookup = useUserLookup()
    await lookup.resolveUsers(['u-1'])

    expect(lookup.getUserName('u-1')).toBe('u-1')
  })
})
