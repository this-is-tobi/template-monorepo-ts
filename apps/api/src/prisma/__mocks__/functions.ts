export * from '../functions.ts'

vi.mock('node:child_process', (importOriginal) => {
  return {
    ...importOriginal(),
    execSync: vi.fn(),
  }
})
