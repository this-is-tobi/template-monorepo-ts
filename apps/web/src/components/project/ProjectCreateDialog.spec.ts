import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProjectsStore } from '~/stores/projects'
import { mountPage } from '~/test/helpers'
import ProjectCreateDialog from './ProjectCreateDialog.vue'

const { mockNotify } = vi.hoisted(() => ({
  mockNotify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('~/composables/useNotify', () => ({ useNotify: () => mockNotify }))
vi.mock('~/lib/api', () => ({
  apiClient: {
    projects: {
      getAll: vi.fn().mockResolvedValue({ data: { data: [] } }),
      create: vi.fn(),
    },
  },
}))

describe('projectCreateDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should create the project the form describes', async () => {
    const { wrapper } = await mountPage(ProjectCreateDialog, { props: { open: true } })
    const store = useProjectsStore()
    store.createProject = vi.fn().mockResolvedValue({ id: 'p-1', name: 'Alpha' })
    await flushPromises()

    await wrapper.findAll('input')[0]!.setValue('Alpha')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(store.createProject).toHaveBeenCalledWith({ name: 'Alpha', description: null })
    expect(mockNotify.success).toHaveBeenCalledWith('Project created', 'Alpha')
  })

  it('should announce the new project and close', async () => {
    const { wrapper } = await mountPage(ProjectCreateDialog, { props: { open: true } })
    const store = useProjectsStore()
    const created = { id: 'p-1', name: 'Alpha' }
    store.createProject = vi.fn().mockResolvedValue(created)
    await flushPromises()

    await wrapper.findAll('input')[0]!.setValue('Alpha')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('created')?.[0]).toEqual([created])
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('should stay open and say nothing happened when the create fails', async () => {
    // The store swallows the failure into `error`, which the dialog renders —
    // closing here would drop the message along with the typed-in name.
    const { wrapper } = await mountPage(ProjectCreateDialog, { props: { open: true } })
    const store = useProjectsStore()
    store.createProject = vi.fn().mockResolvedValue(null)
    await flushPromises()

    await wrapper.findAll('input')[0]!.setValue('Alpha')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('created')).toBeUndefined()
    expect(wrapper.emitted('update:open')).toBeUndefined()
    expect(mockNotify.success).not.toHaveBeenCalled()
  })

  it('should send an empty description as null rather than an empty string', async () => {
    const { wrapper } = await mountPage(ProjectCreateDialog, { props: { open: true } })
    const store = useProjectsStore()
    store.createProject = vi.fn().mockResolvedValue({ id: 'p-1', name: 'Alpha' })
    await flushPromises()

    await wrapper.findAll('input')[0]!.setValue('Alpha')
    await wrapper.findAll('input')[1]!.setValue('')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(store.createProject).toHaveBeenCalledWith({ name: 'Alpha', description: null })
  })
})
