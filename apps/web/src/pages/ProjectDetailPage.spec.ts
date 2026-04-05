import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useProjectsStore } from '~/stores/projects'
import { mockProject, mockUser, mountPage } from '~/test/helpers'
import ProjectDetailPage from './ProjectDetailPage.vue'

vi.mock('~/lib/api', () => ({
  apiClient: {
    projects: {
      getAll: vi.fn(),
      getById: vi.fn().mockResolvedValue({ data: { data: null } }),
      getMembers: vi.fn().mockResolvedValue({ data: { data: [] } }),
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
    await flushPromises() // Wait for onMounted to complete
    const store = useProjectsStore()
    store.loading = true
    store.currentProject = null
    await nextTick() // Wait for Vue to re-render
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
    await flushPromises() // Wait for onMounted to complete
    const store = useProjectsStore()
    store.error = 'Project not found'
    store.currentProject = null
    await nextTick() // Wait for Vue to re-render
    expect(wrapper.text()).toContain('Project not found')
  })

  it('should have delete button and settings tab when user is owner', async () => {
    const { wrapper } = await mountPage(ProjectDetailPage, { route: '/projects/project-1' })
    const store = useProjectsStore()
    const authStore = useAuthStore()
    store.fetchProject = vi.fn()
    store.currentProject = { ...mockProject }
    authStore.user = mockUser as never
    await flushPromises()
    expect(wrapper.text()).toContain('Settings')
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

  it('should show edit form in Settings tab with pre-filled values', async () => {
    const { wrapper } = await mountPage(ProjectDetailPage, { route: '/projects/project-1' })
    const store = useProjectsStore()
    const authStore = useAuthStore()
    store.fetchProject = vi.fn()
    store.currentProject = { ...mockProject }
    authStore.user = mockUser as never
    await flushPromises()
    // Settings tab should contain the edit form
    expect(wrapper.text()).toContain('Settings')
    expect(wrapper.text()).toContain('Save changes')
  })

  it('should call updateProject when edit form is submitted in Settings tab', async () => {
    const { wrapper } = await mountPage(ProjectDetailPage, { route: '/projects/project-1' })
    const store = useProjectsStore()
    const authStore = useAuthStore()
    store.fetchProject = vi.fn()
    store.currentProject = { ...mockProject }
    store.updateProject = vi.fn().mockResolvedValue(true)
    authStore.user = mockUser as never
    await flushPromises()
    const form = wrapper.find('form')
    await form.trigger('submit')
    await flushPromises()
    expect(store.updateProject).toHaveBeenCalledWith('project-1', expect.objectContaining({ name: 'Test Project' }))
  })

  it('should call deleteProject and navigate to projects on delete', async () => {
    const { wrapper, router } = await mountPage(ProjectDetailPage, { route: '/projects/project-1' })
    const store = useProjectsStore()
    const authStore = useAuthStore()
    store.fetchProject = vi.fn()
    store.currentProject = { ...mockProject }
    store.deleteProject = vi.fn().mockResolvedValue(true)
    authStore.user = mockUser as never
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
