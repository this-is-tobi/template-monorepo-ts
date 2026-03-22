import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProjectsStore } from '~/stores/projects'
import { mockProject, mountPage } from '~/test/helpers'
import ProjectDetailPage from './ProjectDetailPage.vue'

vi.mock('~/lib/api', () => ({
  apiClient: {
    projects: {
      getAll: vi.fn(),
      getById: vi.fn().mockResolvedValue({ data: { data: null } }),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

describe('projectDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state initially', async () => {
    const { wrapper } = await mountPage(ProjectDetailPage, { route: '/projects/project-1' })
    const store = useProjectsStore()
    store.fetchProject = vi.fn()
    store.loading = true
    store.currentProject = null
    await flushPromises()
    expect(wrapper.text()).toContain('Loading...')
  })

  it('should display project name', async () => {
    const { wrapper } = await mountPage(ProjectDetailPage, { route: '/projects/project-1' })
    const store = useProjectsStore()
    store.fetchProject = vi.fn()
    store.currentProject = { ...mockProject }
    await flushPromises()
    expect(wrapper.text()).toContain('Test Project')
  })

  it('should display project description', async () => {
    const { wrapper } = await mountPage(ProjectDetailPage, { route: '/projects/project-1' })
    const store = useProjectsStore()
    store.fetchProject = vi.fn()
    store.currentProject = { ...mockProject }
    await flushPromises()
    expect(wrapper.text()).toContain('A test project')
  })

  it('should display project metadata', async () => {
    const { wrapper } = await mountPage(ProjectDetailPage, { route: '/projects/project-1' })
    const store = useProjectsStore()
    store.fetchProject = vi.fn()
    store.currentProject = { ...mockProject }
    await flushPromises()
    expect(wrapper.text()).toContain('project-1')
    expect(wrapper.text()).toContain('user-1')
  })

  it('should show error message on failure', async () => {
    const { wrapper } = await mountPage(ProjectDetailPage, { route: '/projects/project-1' })
    const store = useProjectsStore()
    store.fetchProject = vi.fn()
    store.error = 'Project not found'
    store.currentProject = null
    await flushPromises()
    expect(wrapper.text()).toContain('Project not found')
  })

  it('should have edit and delete buttons', async () => {
    const { wrapper } = await mountPage(ProjectDetailPage, { route: '/projects/project-1' })
    const store = useProjectsStore()
    store.fetchProject = vi.fn()
    store.currentProject = { ...mockProject }
    await flushPromises()
    expect(wrapper.text()).toContain('Edit')
    expect(wrapper.text()).toContain('Delete')
  })

  it('should have back to projects button', async () => {
    const { wrapper } = await mountPage(ProjectDetailPage, { route: '/projects/project-1' })
    const store = useProjectsStore()
    store.fetchProject = vi.fn()
    store.currentProject = { ...mockProject }
    await flushPromises()
    expect(wrapper.text()).toContain('Projects')
  })

  it('should open edit dialog with pre-filled values when Edit is clicked', async () => {
    const { wrapper } = await mountPage(ProjectDetailPage, { route: '/projects/project-1' })
    const store = useProjectsStore()
    store.fetchProject = vi.fn()
    store.currentProject = { ...mockProject }
    await flushPromises()
    // Dialog should not be visible initially
    expect(wrapper.text()).not.toContain('Update your project details')
    const editBtn = wrapper.findAll('button').find(b => b.text() === 'Edit')!
    await editBtn.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Update your project details')
  })

  it('should call updateProject when edit form is submitted', async () => {
    const { wrapper } = await mountPage(ProjectDetailPage, { route: '/projects/project-1' })
    const store = useProjectsStore()
    store.fetchProject = vi.fn()
    store.currentProject = { ...mockProject }
    store.updateProject = vi.fn().mockResolvedValue(true)
    await flushPromises()
    const editBtn = wrapper.findAll('button').find(b => b.text() === 'Edit')!
    await editBtn.trigger('click')
    await flushPromises()
    const form = wrapper.find('form')
    await form.trigger('submit')
    await flushPromises()
    expect(store.updateProject).toHaveBeenCalledWith('project-1', expect.objectContaining({ name: 'Test Project' }))
  })

  it('should call deleteProject and navigate to projects on delete', async () => {
    const { wrapper, router } = await mountPage(ProjectDetailPage, { route: '/projects/project-1' })
    const store = useProjectsStore()
    store.fetchProject = vi.fn()
    store.currentProject = { ...mockProject }
    store.deleteProject = vi.fn().mockResolvedValue(true)
    await flushPromises()
    // Step 1: click Delete to open confirmation dialog
    const openDialogBtn = wrapper.findAll('button').find(b => b.text() === 'Delete')!
    await openDialogBtn.trigger('click')
    await wrapper.vm.$nextTick()
    // Step 2: click the confirm Delete button inside the dialog
    const confirmDeleteBtn = wrapper.findAll('button').filter(b => b.text() === 'Delete').at(-1)!
    await confirmDeleteBtn.trigger('click')
    await flushPromises()
    expect(store.deleteProject).toHaveBeenCalledWith('project-1')
    expect(router.currentRoute.value.name).toBe('projects')
  })
})
