import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useConfirm, useConfirmState } from './useConfirm'

const { require: requireConfirm } = useConfirm()
const { state, accept, reject, dismiss } = useConfirmState()

/** Opens a dialog with both callbacks spied. */
function open(over: Partial<Parameters<typeof requireConfirm>[0]> = {}) {
  const onAccept = vi.fn()
  const onReject = vi.fn()
  requireConfirm({
    header: 'Delete project?',
    message: 'This cannot be undone.',
    accept: onAccept,
    reject: onReject,
    ...over,
  })
  return { onAccept, onReject }
}

describe('useConfirm', () => {
  // The state is a module-level singleton — one dialog for the whole app — so
  // a test that leaves it open would bleed into the next.
  beforeEach(() => dismiss())

  describe('require', () => {
    it('should open the dialog with the supplied copy', () => {
      open()

      expect(state.value.open).toBe(true)
      expect(state.value.header).toBe('Delete project?')
      expect(state.value.message).toBe('This cannot be undone.')
    })

    it('should replace a pending dialog rather than queue behind it', () => {
      // Documents the singleton: a second caller wins, and the first one's
      // callbacks are dropped rather than fired later against stale copy.
      const first = open({ header: 'First' })
      open({ header: 'Second' })

      expect(state.value.header).toBe('Second')

      accept()
      expect(first.onAccept).not.toHaveBeenCalled()
    })

    it('should carry the button props through to the host', () => {
      requireConfirm({
        header: 'Delete?',
        message: 'Gone for good.',
        acceptProps: { label: 'Delete', severity: 'danger' },
        rejectProps: { label: 'Keep' },
      })

      expect(state.value.acceptProps).toEqual({ label: 'Delete', severity: 'danger' })
      expect(state.value.rejectProps).toEqual({ label: 'Keep' })
    })
  })

  describe('accept', () => {
    it('should run the accept callback and close', () => {
      const { onAccept, onReject } = open()

      accept()

      expect(onAccept).toHaveBeenCalledOnce()
      expect(onReject).not.toHaveBeenCalled()
      expect(state.value.open).toBe(false)
    })

    it('should not throw when no callback was supplied', () => {
      requireConfirm({ header: 'Notice', message: 'Just so you know.' })
      expect(() => accept()).not.toThrow()
      expect(state.value.open).toBe(false)
    })
  })

  describe('reject', () => {
    it('should run the reject callback and close', () => {
      const { onAccept, onReject } = open()

      reject()

      expect(onReject).toHaveBeenCalledOnce()
      expect(onAccept).not.toHaveBeenCalled()
      expect(state.value.open).toBe(false)
    })

    it('should not throw when no callback was supplied', () => {
      requireConfirm({ header: 'Notice', message: 'Just so you know.' })
      expect(() => reject()).not.toThrow()
    })
  })

  describe('dismiss', () => {
    it('should close without running either callback', () => {
      // Escape or an overlay click is neither a confirmation nor an explicit
      // cancel. No caller passes `reject` today, so this is inert — but it is
      // the behaviour the host relies on, so pin it rather than rediscover it.
      const { onAccept, onReject } = open()

      dismiss()

      expect(state.value.open).toBe(false)
      expect(onAccept).not.toHaveBeenCalled()
      expect(onReject).not.toHaveBeenCalled()
    })

    it('should never confirm a destructive action by accident', () => {
      const { onAccept } = open({ acceptProps: { severity: 'danger' } })

      dismiss()
      dismiss()

      expect(onAccept).not.toHaveBeenCalled()
    })
  })
})
