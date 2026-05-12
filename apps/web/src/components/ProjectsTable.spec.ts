import { describe, expect, it } from 'vitest'
import { mountPage } from '~/test/helpers'
import ProjectsTable from './ProjectsTable.vue'

const projects = [
  { id: 'p-1', name: 'Alpha', description: 'First project', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'p-2', name: 'Beta', description: null, createdAt: '2024-03-01T00:00:00Z' },
]

describe('projectsTable', () => {
  it('renders without errors', async () => {
    const { wrapper } = await mountPage(ProjectsTable, { props: { projects } })
    expect(wrapper.exists()).toBe(true)
  })

  it('shows default empty message when projects array is empty', async () => {
    const { wrapper } = await mountPage(ProjectsTable, { props: { projects: [] } })
    expect(wrapper.text()).toContain('No projects.')
  })

  it('shows a custom empty message when provided', async () => {
    const { wrapper } = await mountPage(ProjectsTable, {
      props: { projects: [], emptyMessage: 'No projects in this organization.' },
    })
    expect(wrapper.text()).toContain('No projects in this organization.')
  })

  it('does not show the empty message when projects are present', async () => {
    const { wrapper } = await mountPage(ProjectsTable, { props: { projects } })
    expect(wrapper.text()).not.toContain('No projects.')
  })

  it('renders without errors when loading is true', async () => {
    const { wrapper } = await mountPage(ProjectsTable, { props: { projects: [], loading: true } })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders with paginator props without errors', async () => {
    const { wrapper } = await mountPage(ProjectsTable, {
      props: { projects, paginator: true, lazy: true, rows: 10, total: 25, first: 0 },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders project with null description without errors', async () => {
    const { wrapper } = await mountPage(ProjectsTable, {
      props: { projects: [{ id: 'p-3', name: 'Gamma', description: null, createdAt: '2024-06-01T00:00:00Z' }] },
    })
    expect(wrapper.exists()).toBe(true)
  })
})
