import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProjectsStore } from '~/stores/projects'
import { mountPage } from '~/test/helpers'
import AdminProjectDetailPage from './AdminProjectDetailPage.vue'

vi.mock('~/lib/api', () => ({
  apiClient: {
    projects: {
      getById: vi.fn().mockResolvedValue({ data: { data: null } }),
      getMembers: vi.fn().mockResolvedValue({ data: { data: [] } }),
    },
    admin: {
      getOrganizations: vi.fn().mockResolvedValue({ data: { data: [] } }),
    },
  },
}))

const mockProject = {
  id: 'proj-1',
  name: 'Test Project',
  description: 'A test project',
  ownerId: 'u-1',
  organizationId: 'org-1',
  owner: { id: 'u-1', name: 'Alice', email: 'alice@example.com', image: null },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
}

const mockMembers = [
  { id: 'pm-1', userId: 'u-1', projectId: 'proj-1', role: 'owner', createdAt: '2026-01-01T00:00:00.000Z', user: { id: 'u-1', name: 'Alice', email: 'alice@example.com', image: null } },
  { id: 'pm-2', userId: 'u-2', projectId: 'proj-1', role: 'member', createdAt: '2026-01-02T00:00:00.000Z', user: { id: 'u-2', name: 'Bob', email: 'bob@example.com', image: null } },
]

describe('adminProjectDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state initially', async () => {
    const { wrapper } = await mountPage(AdminProjectDetailPage, { route: '/settings/admin/projects/proj-1' })
    const store = useProjectsStore()
    await flushPromises()
    store.loading = true
    store.currentProject = null
    store.members = []
    await flushPromises()
    expect(wrapper.text()).toContain('Loading...')
  })

  it('should display error message', async () => {
    const { wrapper } = await mountPage(AdminProjectDetailPage, { route: '/settings/admin/projects/proj-1' })
    const store = useProjectsStore()
    await flushPromises()
    store.loading = false
    store.error = 'Project not found'
    store.currentProject = null
    store.members = []
    await flushPromises()
    expect(wrapper.text()).toContain('Project not found')
  })

  it('should display project name and description', async () => {
    const { wrapper } = await mountPage(AdminProjectDetailPage, { route: '/settings/admin/projects/proj-1' })
    const store = useProjectsStore()
    store.currentProject = { ...mockProject } as never
    store.members = [...mockMembers] as never
    await flushPromises()
    expect(wrapper.text()).toContain('Test Project')
    expect(wrapper.text()).toContain('A test project')
  })

  it('should show member count in tab', async () => {
    const { wrapper } = await mountPage(AdminProjectDetailPage, { route: '/settings/admin/projects/proj-1' })
    const store = useProjectsStore()
    await flushPromises()
    store.members = [...mockMembers] as never
    store.currentProject = { ...mockProject } as never
    await flushPromises()
    expect(wrapper.text()).toContain('Members (2)')
  })

  it('should show back button to admin projects', async () => {
    const { wrapper } = await mountPage(AdminProjectDetailPage, { route: '/settings/admin/projects/proj-1' })
    const store = useProjectsStore()
    store.currentProject = { ...mockProject } as never
    await flushPromises()
    expect(wrapper.text()).toContain('All projects')
  })

  it('should show owner name as link', async () => {
    const { wrapper } = await mountPage(AdminProjectDetailPage, { route: '/settings/admin/projects/proj-1' })
    const store = useProjectsStore()
    store.currentProject = { ...mockProject } as never
    await flushPromises()
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('u-1')
  })
})
