export * from '../functions.js'

vi.mock('node:child_process', (importOriginal) => {
  return {
    ...importOriginal(),
    execSync: vi.fn(),
  }
})
