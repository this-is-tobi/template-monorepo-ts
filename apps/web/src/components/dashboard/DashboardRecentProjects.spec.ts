import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProjectsStore } from '~/stores/projects'
import { mountPage } from '~/test/helpers'
import DashboardRecentProjects from './DashboardRecentProjects.vue'

const { mockGetAll } = vi.hoisted(() => ({ mockGetAll: vi.fn() }))

vi.mock('~/lib/api', () => ({
  apiClient: { projects: { getAll: (...args: unknown[]) => mockGetAll(...args) } },
}))

function project(over: Record<string, unknown> = {}) {
  return {
    id: 'project-1',
    name: 'Apollo',
    description: 'Launch platform',
    ownerId: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

/** Mount, then seed the store — the widget fetches on mount. */
async function mountWithProjects(projects: ReturnType<typeof project>[]) {
  const mounted = await mountPage(DashboardRecentProjects)
  useProjectsStore().projects = projects as never
  await flushPromises()
  return mounted
}

describe('dashboardRecentProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAll.mockResolvedValue({ data: { data: [], total: 0 } })
  })

  it('should invite the user to create one when there are none', async () => {
    const { wrapper } = await mountWithProjects([])

    expect(wrapper.text()).toContain('No projects yet')
    expect(wrapper.text()).toContain('Create one')
  })

  it('should hide the "View all" link while the list is empty', async () => {
    // Nothing to view — the link would lead to the same empty state.
    const { wrapper } = await mountWithProjects([])
    expect(wrapper.text()).not.toContain('View all')
  })

  it('should list projects with their description', async () => {
    const { wrapper } = await mountWithProjects([
      project({ id: 'p1', name: 'Apollo', description: 'Launch platform' }),
      project({ id: 'p2', name: 'Gemini', description: 'Pairing tool' }),
    ])

    expect(wrapper.text()).toContain('Apollo')
    expect(wrapper.text()).toContain('Launch platform')
    expect(wrapper.text()).toContain('Gemini')
    expect(wrapper.text()).toContain('View all')
  })

  it('should link each project to its detail page', async () => {
    const { wrapper } = await mountWithProjects([project({ id: 'p1', name: 'Apollo' })])
    expect(wrapper.find('a[href="/projects/p1"]').text()).toContain('Apollo')
  })

  it('should cope with a project that has no description', async () => {
    const { wrapper } = await mountWithProjects([project({ name: 'Bare', description: null })])

    expect(wrapper.text()).toContain('Bare')
    expect(wrapper.text()).not.toContain('null')
  })

  it('should request only a handful of projects, not the whole list', async () => {
    // This is the dashboard preview, not the projects page. Asserted at the
    // API boundary because the widget's watcher fires during setup, before a
    // spy on the store could be attached.
    await mountPage(DashboardRecentProjects)
    await flushPromises()

    expect(mockGetAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 5 }))
  })
})
