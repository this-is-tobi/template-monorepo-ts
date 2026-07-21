import { readonly, ref } from 'vue'

export interface ConfirmOptions {
  header: string
  message: string
  /** Props for the confirm button — `severity: 'danger'` renders it destructive. */
  acceptProps?: { label?: string, severity?: string, outlined?: boolean }
  /** Props for the cancel button. */
  rejectProps?: { label?: string, severity?: string, outlined?: boolean }
  accept?: () => void
  reject?: () => void
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
}

/**
 * Singleton confirm state — one dialog instance for the whole app, rendered
 * by `ConfirmDialogHost` (mounted once in App.vue).
 */
const state = ref<ConfirmState>({ open: false, header: '', message: '' })

export function useConfirm() {
  /** Opens the global confirm dialog. Same shape as PrimeVue's `confirm.require`. */
  function require(options: ConfirmOptions) {
    state.value = { ...options, open: true }
  }

  return { require }
}

/** Internal — consumed by ConfirmDialogHost only. */
export function useConfirmState() {
  function accept() {
    state.value.accept?.()
    state.value.open = false
  }

  function reject() {
    state.value.reject?.()
    state.value.open = false
  }

  function dismiss() {
    state.value.open = false
  }

  return { state: readonly(state), accept, reject, dismiss }
}
