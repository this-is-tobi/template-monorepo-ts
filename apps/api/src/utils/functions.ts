export const getNodeEnv: () => 'development' | 'test' | 'production' = () => {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return process.env.NODE_ENV
  }
  return 'production'
}

export const makeWritable = (module: unknown, property: string, newValue?: unknown) => Object.defineProperty(module, property, {
  ...((newValue && { value: newValue }) ?? {}),
  configurable: true,
  writable: true,
})

export const isWritable = <T>(obj: T, key: keyof T) => {
  const desc = Object.getOwnPropertyDescriptor(obj, key)
  return Boolean(desc?.writable)
}
