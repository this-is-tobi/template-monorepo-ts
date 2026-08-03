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

/** The column heads, which carry the role name, its count and its summary. */
function roleHeaders(wrapper: ReturnType<typeof mountMatrix>) {
  return wrapper.findAll('thead th[scope="col"]')
}

describe('rolePermissionMatrix', () => {
  describe('project scope', () => {
    it('should show every project role as a column', () => {
      const wrapper = mountMatrix()
      const headers = roleHeaders(wrapper).map(h => h.text())

      expect(headers).toHaveLength(Object.keys(PROJECT_ROLES).length)
      for (const role of Object.keys(PROJECT_ROLES)) {
        expect(headers.some(text => text.toLowerCase().includes(role))).toBe(true)
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
            // Rows only exist for permissions some project role grants.
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
      // An `organization` or `audit` row would be an all-empty line on every
      // project — noise that buries the rows that decide anything.
      const wrapper = mountMatrix()

      expect(wrapper.find('[aria-label$="create invitation"]').exists()).toBe(false)
      expect(wrapper.find('[aria-label$="read audit"]').exists()).toBe(false)
    })

    it('should leave out actions no role grants either', () => {
      // `project:create` is an organization-level action, so no project role
      // grants it. Keying the filter on the resource alone left it as a full
      // row of dashes, which reads as a bug in the table rather than a fact
      // about the roles.
      const wrapper = mountMatrix()

      expect(wrapper.find('[aria-label$="create project"]').exists()).toBe(false)
      expect(wrapper.find('[aria-label$="read project"]').exists()).toBe(true)
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

    it('should group rows under the resource they belong to', () => {
      // The rows used to be prefixed with a transparent copy of the resource
      // name, which grouped them for nobody.
      const wrapper = mountMatrix()
      const groups = wrapper.findAll('th[scope="rowgroup"]').map(h => h.text())

      expect(groups).toEqual(['Project', 'Service keys'])
    })
  })

  describe('how much each role grants', () => {
    it('should count the permissions a role holds', () => {
      // Seven rows of ticks is a shape to scan; "2 of 7" is a fact to read.
      const wrapper = mountMatrix()
      const headers = roleHeaders(wrapper).map(h => h.text())

      expect(headers[0]).toContain('7 of 7') // owner
      expect(headers[2]).toContain('2 of 7') // member: project read + update
      expect(headers[3]).toContain('1 of 7') // viewer: project read
    })

    it('should say when two roles grant the same thing', () => {
      // Project owner and admin currently do, and two identical columns with
      // no explanation read as a mistake in the table.
      const wrapper = mountMatrix()

      expect(wrapper.text()).toContain('grant exactly the same permissions')
    })

    it('should stay quiet when every role differs', () => {
      const wrapper = mountMatrix({ scope: 'organization' })

      expect(wrapper.text()).not.toContain('grant exactly the same permissions')
    })
  })

  describe('custom roles', () => {
    // A custom role listed apart from the table, as "5 permissions", says how
    // many without saying which — nobody can review that.
    const extraRoles = {
      auditor: { permissions: { audit: ['read'], project: ['read'] }, summary: 'Reads everything, changes nothing.' },
    }

    it('should show a runtime role as a column beside the built-in ones', () => {
      const wrapper = mountMatrix({ scope: 'organization', extraRoles })
      const headers = roleHeaders(wrapper).map(h => h.text())

      expect(headers).toHaveLength(Object.keys(ORGANIZATION_ROLES).length + 1)
      expect(headers.at(-1)).toContain('Auditor')
    })

    it('should mark exactly what the custom role grants', () => {
      const wrapper = mountMatrix({ scope: 'organization', extraRoles })

      expect(granted(wrapper, 'auditor', 'audit', 'read')).toBe(true)
      expect(granted(wrapper, 'auditor', 'project', 'read')).toBe(true)
      expect(granted(wrapper, 'auditor', 'project', 'delete')).toBe(false)
      expect(granted(wrapper, 'auditor', 'organization', 'delete')).toBe(false)
    })

    it('should count it against the same total as the built-in roles', () => {
      const wrapper = mountMatrix({ scope: 'organization', extraRoles })

      expect(roleHeaders(wrapper).at(-1)!.text()).toContain('2 of')
    })

    it('should say when a custom role duplicates a built-in one', () => {
      // Worth knowing before you assign it: the custom role adds nothing.
      const wrapper = mountMatrix({
        scope: 'organization',
        extraRoles: { shadow: { permissions: ORGANIZATION_ROLES.admin.permissions, summary: 'A copy.' } },
      })

      expect(wrapper.text()).toContain('grant exactly the same permissions')
    })

    it('should leave the table alone when there are none', () => {
      const wrapper = mountMatrix({ scope: 'organization' })

      expect(roleHeaders(wrapper)).toHaveLength(Object.keys(ORGANIZATION_ROLES).length)
    })
  })

  describe('highlighting', () => {
    it('should mark the selected role for assistive tech, not just visually', () => {
      const wrapper = mountMatrix({ highlight: 'admin' })
      const current = roleHeaders(wrapper).filter(h => h.attributes('aria-current') === 'true')

      expect(current).toHaveLength(1)
      expect(current[0]!.text()).toContain('Admin')
    })

    it('should mark nothing when no role is selected', () => {
      const wrapper = mountMatrix()

      expect(wrapper.findAll('[aria-current="true"]')).toHaveLength(0)
    })

    it('should name the reader’s own column when asked', () => {
      // A viewer and a member see the same page with the same buttons missing;
      // the chip is what tells them which one they are.
      const wrapper = mountMatrix({ highlight: 'member', highlightIsYou: true })

      expect(wrapper.text()).toContain('You')
    })

    it('should not claim the column is yours when it is a role being assigned', () => {
      const wrapper = mountMatrix({ highlight: 'member' })
      const current = roleHeaders(wrapper).filter(h => h.attributes('aria-current') === 'true')

      expect(current[0]!.text()).not.toContain('You')
    })
  })

  describe('organization scope', () => {
    it('should switch to the organization roles and resources', () => {
      const wrapper = mountMatrix({ scope: 'organization' })
      const headers = roleHeaders(wrapper).map(h => h.text())

      expect(headers.some(text => text.includes('Owner'))).toBe(true)
      expect(headers.some(text => text.includes('Member'))).toBe(true)
      expect(wrapper.find('[aria-label$="create invitation"]').exists()).toBe(true)
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
    // The wording sits behind a hint rather than inline, the same way the
    // pickers do it. One mechanism, and the grid stays one line per row
    // wherever the matrix appears — under a role dropdown, or on a phone.
    it('should offer the wording for every permission it renders', () => {
      const wrapper = mountMatrix()

      for (const definition of Object.values(PROJECT_ROLES)) {
        for (const [resource, actions] of Object.entries(definition.permissions)) {
          for (const action of actions) {
            expect(
              wrapper.find(`[aria-label="What ${resource}:${action} allows"]`).exists(),
              `${resource}:${action} has no hint`,
            ).toBe(true)
          }
        }
      }
    })

    it('should keep the sentences out of the table until asked for', () => {
      // Inline they made every row several lines tall, which buried the grid
      // the table exists for.
      const wrapper = mountMatrix()

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
      // The counts stay: they are one line and answer "how much is this role".
      expect(wrapper.text()).toContain('1 of 7')
    })

    it('should carry a summary for every organization role too', () => {
      const wrapper = mountMatrix({ scope: 'organization' })

      for (const definition of Object.values(ORGANIZATION_ROLES)) {
        expect(wrapper.text()).toContain(definition.summary)
      }
    })
  })
})
