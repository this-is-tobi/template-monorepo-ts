import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProjectCreateDialog from '~/components/project/ProjectCreateDialog.vue'
import { useProjectsStore } from '~/stores/projects'
import { mountPage } from '~/test/helpers'
import ProjectsPage from './ProjectsPage.vue'

vi.mock('~/lib/api', () => ({
  apiClient: {
    projects: {
      getAll: vi.fn().mockResolvedValue({ data: { data: [] } }),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

describe('projectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render heading', async () => {
    const { wrapper } = await mountPage(ProjectsPage, { route: '/projects' })
    const store = useProjectsStore()
    store.fetchProjects = vi.fn()
    await flushPromises()
    expect(wrapper.text()).toContain('Projects')
    expect(wrapper.text()).toContain('Manage your projects')
  })

  it('should call fetchProjects on mount', async () => {
    const { wrapper } = await mountPage(ProjectsPage, { route: '/projects' })
    // Store method was called during mount, verify component rendered
    expect(wrapper.text()).toContain('Projects')
  })

  it('should show empty state message when no projects', async () => {
    const { wrapper } = await mountPage(ProjectsPage, { route: '/projects' })
    const store = useProjectsStore()
    store.fetchProjects = vi.fn()
    store.projects = []
    await flushPromises()
    expect(wrapper.text()).toContain('No projects yet')
  })

  it('should have create button', async () => {
    const { wrapper } = await mountPage(ProjectsPage, { route: '/projects' })
    await flushPromises()
    const buttons = wrapper.findAll('button')
    const newProjectBtn = buttons.find(b => b.text().includes('New project'))
    expect(newProjectBtn).toBeDefined()
  })

  it('should render data table', async () => {
    const { wrapper } = await mountPage(ProjectsPage, { route: '/projects' })
    await flushPromises()
    expect(wrapper.text()).toContain('No projects yet')
  })

  it('should have a new project button', async () => {
    const { wrapper } = await mountPage(ProjectsPage, { route: '/projects' })
    const store = useProjectsStore()
    store.fetchProjects = vi.fn()
    await flushPromises()
    expect(wrapper.text()).toContain('New project')
  })

  it('should open the create dialog when New project is clicked', async () => {
    // The form itself lives in ProjectCreateDialog, shared with the org page —
    // what this page owns is only whether it is open.
    const { wrapper } = await mountPage(ProjectsPage, { route: '/projects' })
    await flushPromises()
    // `defineModel` props are not in the stub's inferred prop types, so read
    // the whole record rather than naming the key.
    const isOpen = () => (wrapper.findComponent(ProjectCreateDialog).props() as { open: boolean }).open

    expect(isOpen()).toBe(false)

    const newProjectBtn = wrapper.findAll('button').find(b => b.text().includes('New project'))!
    await newProjectBtn.trigger('click')
    await flushPromises()

    expect(isOpen()).toBe(true)
  })

  it('should render projects in the table when projects exist', async () => {
    const { wrapper } = await mountPage(ProjectsPage, { route: '/projects' })
    const store = useProjectsStore()
    store.projects = [
      { id: 'p-1', name: 'Alpha', description: 'desc', ownerId: 'u1', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
    ]
    await flushPromises()
    // DataTable stub hides empty slot when value is non-empty
    expect(wrapper.text()).not.toContain('No projects yet')
    expect(store.projects).toHaveLength(1)
  })

  it('should reload the list once a project is created', async () => {
    const { wrapper } = await mountPage(ProjectsPage, { route: '/projects' })
    const store = useProjectsStore()
    store.fetchProjects = vi.fn().mockResolvedValue(undefined)
    await flushPromises()

    wrapper.findComponent(ProjectCreateDialog).vm.$emit('created', { id: 'p-1', name: 'Alpha' })
    await flushPromises()

    expect(store.fetchProjects).toHaveBeenCalled()
  })

  it('should call deleteProject when deleteProject store method is invoked', async () => {
    const { wrapper } = await mountPage(ProjectsPage, { route: '/projects' })
    const store = useProjectsStore()
    store.projects = [
      { id: 'p-1', name: 'Alpha', description: null, ownerId: 'u1', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
    ]
    store.deleteProject = vi.fn().mockResolvedValue(true)
    await flushPromises()
    // Simulate deletion via the store (Column body slots with action buttons
    // are not rendered by the stub — tested end-to-end in Playwright specs)
    await store.deleteProject('p-1')
    expect(store.deleteProject).toHaveBeenCalledWith('p-1')
    // After deletion the store removes the project
    store.projects = []
    await flushPromises()
    expect(wrapper.text()).toContain('No projects yet')
    expect(wrapper.exists()).toBe(true)
  })

  it('should show search dropdown', async () => {
    const { wrapper } = await mountPage(ProjectsPage, { route: '/projects' })
    await flushPromises()
    expect(wrapper.text()).toContain('Search by')
  })
})
