export const repeatFn = (nb: number) => (fn: (optionalParam?: any) => any, optionalParam?: any) => Array.from({ length: nb }).map(() => fn(optionalParam))

export function makeWritable(module: unknown, property: string, newValue?: unknown) {
  return Object.defineProperty(module, property, {
    ...((newValue && { value: newValue }) ?? {}),
    configurable: true,
    writable: true,
  })
}

export function isWritable<T>(obj: T, key: keyof T) {
  const desc = Object.getOwnPropertyDescriptor(obj, key)
  return Boolean(desc?.writable)
}
