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
})
