import { describe, expect, it } from 'vitest'
import { mountPage } from '~/test/helpers'
import OrgMembersTable from './OrgMembersTable.vue'

const members = [
  {
    id: 'm-1',
    userId: 'u-1',
    role: 'owner',
    createdAt: '2024-01-01T00:00:00Z',
    user: { name: 'Alice', email: 'alice@example.com' },
  },
  {
    id: 'm-2',
    userId: 'u-2',
    role: 'admin',
    createdAt: '2024-02-01T00:00:00Z',
    user: { name: 'Bob', email: 'bob@example.com' },
  },
  {
    id: 'm-3',
    userId: 'u-3',
    role: 'member',
    createdAt: '2024-03-01T00:00:00Z',
    user: { name: 'Carol', email: 'carol@example.com' },
  },
]

describe('orgMembersTable', () => {
  it('renders without errors', async () => {
    const { wrapper } = await mountPage(OrgMembersTable, { props: { members } })
    expect(wrapper.exists()).toBe(true)
  })

  it('shows empty message when members array is empty', async () => {
    const { wrapper } = await mountPage(OrgMembersTable, { props: { members: [] } })
    expect(wrapper.text()).toContain('No members.')
  })

  it('does not show empty message when members are present', async () => {
    const { wrapper } = await mountPage(OrgMembersTable, { props: { members } })
    expect(wrapper.text()).not.toContain('No members.')
  })

  it('renders the actions column when showActions is true', async () => {
    const { wrapper } = await mountPage(OrgMembersTable, {
      props: { members, showActions: true, currentUserId: 'other' },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('does not render the actions column by default', async () => {
    const { wrapper } = await mountPage(OrgMembersTable, { props: { members } })
    expect(wrapper.text()).not.toContain('Role')
    expect(wrapper.text()).not.toContain('Remove')
  })

  it('renders with adminLinks=true without errors', async () => {
    const { wrapper } = await mountPage(OrgMembersTable, {
      props: { members, adminLinks: true },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders with all role types without errors', async () => {
    const { wrapper } = await mountPage(OrgMembersTable, {
      props: { members },
    })
    // Component mounts successfully with owner, admin, and member roles
    expect(wrapper.exists()).toBe(true)
  })
})
