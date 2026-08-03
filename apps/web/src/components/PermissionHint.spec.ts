import { PERMISSION_DESCRIPTIONS } from '@template-monorepo-ts/shared'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PermissionHint from './PermissionHint.vue'

function mountHint(props: Record<string, unknown>) {
  return mount(PermissionHint, { props, attachTo: document.body })
}

describe('permissionHint', () => {
  it('should offer a trigger naming the permission it explains', () => {
    const wrapper = mountHint({ resource: 'project', action: 'manage-members' })

    expect(wrapper.get('button').attributes('aria-label')).toBe('What project:manage-members allows')
  })

  it('should name the resource when it covers all of its actions', () => {
    const wrapper = mountHint({ resource: 'service-key' })

    expect(wrapper.get('button').attributes('aria-label')).toBe('What the Service keys permissions allow')
  })

  it('should never submit the form it sits in', () => {
    // The pickers live inside a <form>; a button without an explicit type
    // defaults to submit, so opening a hint would create the key.
    const wrapper = mountHint({ resource: 'project', action: 'read' })

    expect(wrapper.get('button').attributes('type')).toBe('button')
  })

  it('should explain a single permission on open', async () => {
    const wrapper = mountHint({ resource: 'project', action: 'manage-members' })
    await wrapper.get('button').trigger('click')

    expect(document.body.textContent).toContain(PERMISSION_DESCRIPTIONS['project:manage-members'])
    // Scoped to the one action asked for, not the whole resource.
    expect(document.body.textContent).not.toContain(PERMISSION_DESCRIPTIONS['project:delete'])
    wrapper.unmount()
  })

  it('should explain every action of a resource when no action is named', async () => {
    const wrapper = mountHint({ resource: 'service-key' })
    await wrapper.get('button').trigger('click')

    for (const action of ['read', 'create', 'delete']) {
      expect(document.body.textContent).toContain(PERMISSION_DESCRIPTIONS[`service-key:${action}`])
    }
    wrapper.unmount()
  })

  it('should cover only the actions a picker actually offers', async () => {
    // A service key may never hold `project:manage-members`, so its picker
    // renders a dash there — describing it would advertise a box that is not
    // on the screen.
    const wrapper = mountHint({ resource: 'project', actions: ['read', 'update'] })
    await wrapper.get('button').trigger('click')

    expect(document.body.textContent).toContain(PERMISSION_DESCRIPTIONS['project:read'])
    expect(document.body.textContent).not.toContain(PERMISSION_DESCRIPTIONS['project:manage-members'])
    wrapper.unmount()
  })

  it('should render nothing when there is no wording to show', () => {
    const wrapper = mountHint({ resource: 'not-a-resource' })

    expect(wrapper.find('button').exists()).toBe(false)
  })
})
