import { useToast } from 'primevue/usetoast'

const DEFAULT_LIFE_MS = 4000

/**
 * Thin wrapper around PrimeVue's toast service with sensible defaults.
 *
 * Usage (inside a component `setup`):
 *   const notify = useNotify()
 *   notify.success('Project created')
 *   notify.error('Could not save', err)
 *
 * `error` accepts an optional cause — when it is an `Error`, its message is
 * shown as the toast detail so users see what actually went wrong.
 */
export function useNotify() {
  const toast = useToast()

  function success(summary: string, detail?: string) {
    toast.add({ severity: 'success', summary, detail, life: DEFAULT_LIFE_MS })
  }

  function info(summary: string, detail?: string) {
    toast.add({ severity: 'info', summary, detail, life: DEFAULT_LIFE_MS })
  }

  function error(summary: string, cause?: unknown) {
    const detail = cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : undefined
    toast.add({ severity: 'error', summary, detail, life: 6000 })
  }

  return { success, info, error }
}
