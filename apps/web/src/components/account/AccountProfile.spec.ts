import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccountStore } from '~/stores/account'
import { useAuthStore } from '~/stores/auth'
import { mockAdminUser, mockUser, mountPage } from '~/test/helpers'
import AccountProfile from './AccountProfile.vue'

vi.mock('~/lib/auth', () => ({
  authClient: {
    getSession: vi.fn().mockResolvedValue({ data: { user: null } }),
    updateUser: vi.fn().mockResolvedValue({}),
  },
}))

describe('accountProfile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should seed the form from the signed-in user', async () => {
    const { wrapper } = await mountPage(AccountProfile)
    const auth = useAuthStore()
    auth.user = { ...mockUser }
    await flushPromises()

    expect(wrapper.text()).toContain('test@example.com')
    expect(wrapper.find('#account-name').attributes('placeholder')).toBe('Your name')
  })

  it('should show the admin role badge for admins', async () => {
    const { wrapper } = await mountPage(AccountProfile)
    const auth = useAuthStore()
    auth.user = { ...mockAdminUser }
    await flushPromises()

    expect(wrapper.text()).toContain('Admin')
  })

  it('should keep save disabled until the name actually changes', async () => {
    const { wrapper } = await mountPage(AccountProfile)
    const auth = useAuthStore()
    auth.user = { ...mockUser }
    await flushPromises()

    const save = wrapper.findAll('button').find(b => b.text().includes('Save changes'))
    expect(save?.attributes('disabled')).toBeDefined()
  })

  it('should persist the new name via the account store', async () => {
    const { wrapper } = await mountPage(AccountProfile)
    const auth = useAuthStore()
    const account = useAccountStore()
    auth.user = { ...mockUser }
    account.updateProfile = vi.fn().mockResolvedValue(true)
    await flushPromises()

    await wrapper.find('#account-name').setValue('Renamed')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(account.updateProfile).toHaveBeenCalledWith({ name: 'Renamed' })
  })

  it('should not submit a blank name', async () => {
    const { wrapper } = await mountPage(AccountProfile)
    const auth = useAuthStore()
    const account = useAccountStore()
    auth.user = { ...mockUser }
    account.updateProfile = vi.fn().mockResolvedValue(true)
    await flushPromises()

    await wrapper.find('#account-name').setValue('   ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(account.updateProfile).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Name cannot be empty')
  })

  it('should restore the original name on cancel', async () => {
    const { wrapper } = await mountPage(AccountProfile)
    const auth = useAuthStore()
    auth.user = { ...mockUser }
    await flushPromises()

    await wrapper.find('#account-name').setValue('Renamed')
    const cancel = wrapper.findAll('button').find(b => b.text() === 'Cancel')
    await cancel?.trigger('click')
    await flushPromises()

    expect((wrapper.find('#account-name').element as HTMLInputElement).value).toBe(mockUser.name)
  })
})
