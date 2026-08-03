import { PassThrough } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { promptLine, promptSecret } = await import('./prompt.js')

/**
 * Swap stdin for a stream the test controls.
 *
 * `isTTY` is what the prompt branches on: a terminal gets the echo-suppressed
 * question, anything else gets one line of piped input.
 */
function stubStdin(isTTY: boolean) {
  const stream = new PassThrough() as PassThrough & { isTTY?: boolean }
  stream.isTTY = isTTY
  const original = Object.getOwnPropertyDescriptor(process, 'stdin')!
  Object.defineProperty(process, 'stdin', { value: stream, configurable: true })
  return {
    stream,
    restore: () => Object.defineProperty(process, 'stdin', original),
  }
}

describe('promptSecret', () => {
  let stdout: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
  })

  afterEach(() => {
    stdout.mockRestore()
  })

  it('reads one line from a piped stdin', async () => {
    const { stream, restore } = stubStdin(false)
    try {
      const answer = promptSecret('Password: ')
      stream.end('piped-secret\n')

      await expect(answer).resolves.toBe('piped-secret')
    } finally {
      restore()
    }
  })

  it('tolerates CRLF from a piped stdin', async () => {
    const { stream, restore } = stubStdin(false)
    try {
      const answer = promptSecret('Password: ')
      stream.end('piped-secret\r\n')

      await expect(answer).resolves.toBe('piped-secret')
    } finally {
      restore()
    }
  })

  it('resolves undefined when stdin closes with nothing on it', async () => {
    const { stream, restore } = stubStdin(false)
    try {
      const answer = promptSecret('Password: ')
      stream.end()

      await expect(answer).resolves.toBeUndefined()
    } finally {
      restore()
    }
  })

  // The point of the prompt: what the user types must not reach the terminal,
  // where it would sit in the scrollback for anyone who walks past.
  it('does not echo the secret to stdout', async () => {
    const { stream, restore } = stubStdin(true)
    try {
      const answer = promptSecret('Password: ')
      stream.write('hunter2\n')

      await expect(answer).resolves.toBe('hunter2')

      const written = stdout.mock.calls.map(call => String(call[0])).join('')
      expect(written).not.toContain('hunter2')
      expect(written).toContain('Password: ')
    } finally {
      restore()
    }
  })
})

describe('promptLine', () => {
  it('returns undefined when there is no terminal to ask on', async () => {
    const { restore } = stubStdin(false)
    try {
      await expect(promptLine('Email: ')).resolves.toBeUndefined()
    } finally {
      restore()
    }
  })

  it('reads and trims a typed answer', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const { stream, restore } = stubStdin(true)
    try {
      const answer = promptLine('Email: ')
      stream.write('  user@test.com  \n')

      await expect(answer).resolves.toBe('user@test.com')
    } finally {
      restore()
      stdout.mockRestore()
    }
  })
})
