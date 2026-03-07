import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/**
 * Read and parse a JSON file.
 * Returns null if the file doesn't exist or contains invalid JSON.
 */
export async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * Write data as formatted JSON.
 * Creates parent directories if they don't exist.
 */
export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}
