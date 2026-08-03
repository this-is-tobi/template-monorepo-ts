import { UNTRUSTED_DATA_BEGIN, UNTRUSTED_DATA_END } from '../utils.js'

/**
 * The JSON payload inside a tool result's untrusted-data fence.
 *
 * Tool output is wrapped so the calling model can tell API data from the
 * server's own voice (see `formatSuccess`); tests assert on the data, so they
 * unwrap it here rather than each re-deriving the markers.
 */
export function fencedPayload(text: string): string {
  const start = text.indexOf(UNTRUSTED_DATA_BEGIN)
  const end = text.indexOf(UNTRUSTED_DATA_END)
  if (start === -1 || end === -1) {
    throw new Error(`tool result is not fenced as untrusted data: ${text}`)
  }
  return text.slice(start + UNTRUSTED_DATA_BEGIN.length, end).trim()
}
