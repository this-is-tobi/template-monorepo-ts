export const repeatFn = (nb: number) => (fn: (optionalParam?: any) => any, optionalParam?: any) => Array.from({ length: nb }).map(() => fn(optionalParam))

export const makeWritable = (module: unknown, property: string, newValue?: unknown) => Object.defineProperty(module, property, {
  ...((newValue && { value: newValue }) ?? {}),
  configurable: true,
  writable: true,
})

export const isWritable = <T>(obj: T, key: keyof T) => {
  const desc = Object.getOwnPropertyDescriptor(obj, key)
  return Boolean(desc?.writable)
}
