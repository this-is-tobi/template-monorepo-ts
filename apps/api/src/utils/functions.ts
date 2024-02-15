export const getNodeEnv: () => 'development' | 'test' | 'production' = () => {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return process.env.NODE_ENV
  }
  return 'production'
}

export const snakeCaseToCamelCase = (input: string) => {
  return input
    .split('_')
    .reduce((acc, cur, i) => {
      if (!i) {
        return cur.toLowerCase()
      }
      return acc + cur.charAt(0).toUpperCase() + cur.substring(1).toLowerCase()
    }, '')
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

export const deepMerge = (target: any, source: any) => {
  const result = { ...target, ...source }
  for (const key of Object.keys(result)) {
    if (Array.isArray(target[key]) && Array.isArray(source[key])) {
      result[key] = result[key].map((value: unknown, idx: number) => {
        return typeof value === 'object'
          ? deepMerge(target[key][idx], source[key][idx])
          : structuredClone(result[key][idx])
      })
    } else if (typeof target[key] === 'object' && typeof source[key] === 'object') {
      result[key] = deepMerge(target[key], source[key])
    } else {
      result[key] = structuredClone(result[key])
    }
  }
  return result
}
