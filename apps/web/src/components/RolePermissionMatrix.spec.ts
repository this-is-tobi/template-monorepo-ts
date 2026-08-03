import { ORGANIZATION_ROLES, PERMISSION_DESCRIPTIONS, PERMISSION_MATRIX, PROJECT_ROLES } from '@template-monorepo-ts/shared'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RolePermissionMatrix from './RolePermissionMatrix.vue'

function mountMatrix(props: Record<string, unknown> = {}) {
  return mount(RolePermissionMatrix, { props })
}

/** Cells are labelled for screen readers, which makes them addressable here. */
function granted(wrapper: ReturnType<typeof mountMatrix>, role: string, resource: string, action: string) {
  return wrapper.find(`[aria-label="${role} can ${action} ${resource}"]`).exists()
}

describe('rolePermissionMatrix', () => {
  describe('project scope', () => {
    it('should show every project role as a column', () => {
      const wrapper = mountMatrix()
      const headers = wrapper.findAll('thead th').map(h => h.text())

      for (const role of Object.keys(PROJECT_ROLES)) {
        expect(headers).toContain(role)
      }
    })

    it('should render exactly what the shared table grants, cell for cell', () => {
      // The whole reason this component reads from `PROJECT_ROLES` instead of
      // its own list: a matrix that disagrees with the server is worse than no
      // matrix, because people act on it.
      const wrapper = mountMatrix()

      for (const [role, definition] of Object.entries(PROJECT_ROLES)) {
        for (const [resource, actions] of Object.entries(PERMISSION_MATRIX)) {
          const allowed = (definition.permissions as Record<string, readonly string[]>)[resource] ?? []
          for (const action of actions) {
            // Rows only exist for resources some project role touches.
            const rendered = wrapper.find(`[aria-label$="${action} ${resource}"]`).exists()
            if (!rendered) continue

            expect(
              granted(wrapper, role, resource, action),
              `${role} / ${resource}:${action}`,
            ).toBe(allowed.includes(action))
          }
        }
      }
    })

    it('should leave out resources no project role touches', () => {
      // An `organization` or `invitation` row would be an all-empty line on
      // every project — noise that buries the rows that decide anything.
      const wrapper = mountMatrix()

      expect(wrapper.text()).not.toContain('invitation')
      expect(wrapper.text()).not.toContain('audit')
    })

    it('should show service keys as their own permission', () => {
      // Minting a credential is a different decision from adding a colleague,
      // so it gets its own row rather than hiding inside manage-members.
      const wrapper = mountMatrix()

      expect(granted(wrapper, 'admin', 'service-key', 'create')).toBe(true)
      expect(granted(wrapper, 'member', 'service-key', 'create')).toBe(false)
    })

    it('should distinguish member from viewer, which is the choice people get wrong', () => {
      const wrapper = mountMatrix()

      expect(granted(wrapper, 'member', 'project', 'update')).toBe(true)
      expect(granted(wrapper, 'viewer', 'project', 'update')).toBe(false)
      expect(granted(wrapper, 'member', 'project', 'manage-members')).toBe(false)
    })
  })

  describe('highlighting', () => {
    it('should mark the selected role for assistive tech, not just visually', () => {
      const wrapper = mountMatrix({ highlight: 'admin' })
      const current = wrapper.findAll('thead th').filter(h => h.attributes('aria-current') === 'true')

      expect(current).toHaveLength(1)
      expect(current[0]!.text()).toBe('admin')
    })

    it('should mark nothing when no role is selected', () => {
      const wrapper = mountMatrix()

      expect(wrapper.findAll('[aria-current="true"]')).toHaveLength(0)
    })
  })

  describe('organization scope', () => {
    it('should switch to the organization roles and resources', () => {
      const wrapper = mountMatrix({ scope: 'organization' })
      const headers = wrapper.findAll('thead th').map(h => h.text())

      expect(headers).toContain('owner')
      expect(headers).toContain('member')
      expect(wrapper.text()).toContain('invitation')
    })

    it('should show that an org member holds nothing by default', () => {
      // Deny-by-default is the single most surprising thing about this model,
      // so the matrix has to make it obvious rather than imply it.
      const wrapper = mountMatrix({ scope: 'organization' })

      for (const [resource, actions] of Object.entries(PERMISSION_MATRIX)) {
        for (const action of actions) {
          expect(granted(wrapper, 'member', resource, action)).toBe(false)
        }
      }
    })

    it('should stop an org admin short of deleting the organization', () => {
      const wrapper = mountMatrix({ scope: 'organization' })

      expect(granted(wrapper, 'admin', 'organization', 'update')).toBe(true)
      expect(granted(wrapper, 'admin', 'organization', 'delete')).toBe(false)
      expect(granted(wrapper, 'owner', 'organization', 'delete')).toBe(true)
    })
  })

  describe('permission definitions', () => {
    it('should spell out what each permission means', () => {
      // `project:manage-members` tells a reader nothing on its own, and the
      // person reading it is the one about to grant it.
      const wrapper = mountMatrix()

      expect(wrapper.text()).toContain(PERMISSION_DESCRIPTIONS['project:manage-members'])
      expect(wrapper.text()).toContain(PERMISSION_DESCRIPTIONS['service-key:create'])
    })

    it('should define every permission it renders', () => {
      const wrapper = mountMatrix()

      for (const [role, definition] of Object.entries(PROJECT_ROLES)) {
        void role
        for (const [resource, actions] of Object.entries(definition.permissions)) {
          for (const action of actions) {
            expect(wrapper.text()).toContain(PERMISSION_DESCRIPTIONS[`${resource}:${action}`])
          }
        }
      }
    })

    it('should drop them where the matrix sits under a dropdown', () => {
      // In the assign-a-role dialogs the matrix is a decision aid, and a
      // sentence per row makes it too tall to take in at a glance.
      const wrapper = mountMatrix({ hideDescriptions: true })

      expect(wrapper.text()).not.toContain(PERMISSION_DESCRIPTIONS['project:manage-members'])
      expect(wrapper.text()).toContain('manage-members')
    })
  })

  describe('summaries', () => {
    it('should explain each role in words by default', () => {
      const wrapper = mountMatrix()

      for (const definition of Object.values(PROJECT_ROLES)) {
        expect(wrapper.text()).toContain(definition.summary)
      }
    })

    it('should drop them when asked, for embedding in a tight space', () => {
      const wrapper = mountMatrix({ hideSummaries: true })

      expect(wrapper.text()).not.toContain(PROJECT_ROLES.viewer.summary)
      expect(wrapper.find('tfoot').exists()).toBe(false)
    })

    it('should carry a summary for every organization role too', () => {
      const wrapper = mountMatrix({ scope: 'organization' })

      for (const definition of Object.values(ORGANIZATION_ROLES)) {
        expect(wrapper.text()).toContain(definition.summary)
      }
    })
  })
})
