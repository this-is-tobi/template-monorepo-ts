import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'

/**
 * Ask for a value on the terminal, echoing what is typed.
 *
 * Resolves to `undefined` when there is no terminal to ask on, so callers can
 * fall back to their own error message rather than hanging on a closed stdin.
 */
export async function promptLine(label: string): Promise<string | undefined> {
  if (!process.stdin.isTTY) return undefined

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  try {
    return (await rl.question(label)).trim()
  } finally {
    rl.close()
  }
}

/**
 * Ask for a secret without echoing it.
 *
 * A password passed as `--password` is readable by every other process on the
 * host for as long as the command runs (`ps`, `/proc/<pid>/cmdline`) and is
 * written verbatim into the shell history file, where it outlives the session
 * — and gets copied into dotfile backups and synced repos. So the flag is no
 * longer the only way in: this prompt is, with an environment variable and
 * piped stdin for scripts.
 *
 * Falls back to reading a single line from stdin when it is not a terminal, so
 * `echo "$PASSWORD" | tmts auth login --email me@example.com` works unattended.
 * Resolves to `undefined` when neither is available.
 */
export async function promptSecret(label: string): Promise<string | undefined> {
  if (!process.stdin.isTTY) return readLineFromStdin()

  // readline echoes to its `output`, so the secret is kept off the terminal by
  // giving it one that swallows writes once the question has been printed.
  let muted = false
  const muffled = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk as Buffer | string, encoding)
      callback()
    },
  })

  const rl = createInterface({ input: process.stdin, output: muffled, terminal: true })
  try {
    const answer = rl.question(label)
    muted = true
    const value = await answer
    return value
  } finally {
    rl.close()
    // The newline the user typed was swallowed with everything else.
    process.stdout.write('\n')
  }
}

/**
 * Read a single line from a non-TTY stdin, for piped input.
 *
 * Deliberately one line and no more: the caller wants a credential, not the
 * rest of whatever is on the pipe.
 */
async function readLineFromStdin(): Promise<string | undefined> {
  const rl = createInterface({ input: process.stdin, terminal: false })
  try {
    const { value, done } = await rl[Symbol.asyncIterator]().next()
    return done ? undefined : String(value).replace(/\r$/, '')
  } finally {
    rl.close()
  }
}
