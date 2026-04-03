/**
 * Invokes a factory function `nb` times and returns the results as an array.
 *
 * @param nb - Number of times to call the factory.
 * @returns A curried function that accepts the factory and an optional param.
 */
export const repeatFn = (nb: number) => <T>(fn: (optionalParam?: unknown) => T, optionalParam?: unknown) => Array.from({ length: nb }).map(() => fn(optionalParam))

/**
 * Redefines a module property as writable (useful for mocking readonly exports in tests).
 *
 * @param module  - The module object to modify.
 * @param property - The property name to make writable.
 * @param newValue - Optional new value to assign.
 */
export function makeWritable(module: unknown, property: string, newValue?: unknown) {
  return Object.defineProperty(module, property, {
    ...((newValue && { value: newValue }) ?? {}),
    configurable: true,
    writable: true,
  })
}

/**
 * Checks whether a property on an object is writable.
 *
 * @param obj - The object to inspect.
 * @param key - The property key to check.
 * @returns `true` if the property descriptor has `writable: true`.
 */
export function isWritable<T>(obj: T, key: keyof T) {
  const desc = Object.getOwnPropertyDescriptor(obj, key)
  return Boolean(desc?.writable)
}
