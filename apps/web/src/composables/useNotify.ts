import { toast } from 'vue-sonner'

const DEFAULT_LIFE_MS = 4000

/**
 * Thin wrapper around vue-sonner with sensible defaults.
 *
 * Usage (inside a component `setup`):
 *   const notify = useNotify()
 *   notify.success('Project created')
 *   notify.error('Could not save', err)
 *
 * `error` accepts an optional cause — when it is an `Error`, its message is
 * shown as the toast description so users see what actually went wrong.
 */
export function useNotify() {
  function success(summary: string, detail?: string) {
    toast.success(summary, { description: detail, duration: DEFAULT_LIFE_MS })
  }

  function info(summary: string, detail?: string) {
    toast.info(summary, { description: detail, duration: DEFAULT_LIFE_MS })
  }

  function error(summary: string, cause?: unknown) {
    const detail = cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : undefined
    toast.error(summary, { description: detail, duration: 6000 })
  }

  return { success, info, error }
}
