export function snakeCaseToCamelCase(input: string) {
  return input
    .split('_')
    .reduce((acc, cur, i) => {
      if (!i) {
        return cur.toLowerCase()
      }
      return acc + cur.charAt(0).toUpperCase() + cur.substring(1).toLowerCase()
    }, '')
}

export function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target, ...source }
  for (const key of Object.keys(result)) {
    if (Array.isArray(target[key]) && Array.isArray(source[key])) {
      const targetArray = target[key] as unknown[]
      const sourceArray = source[key] as unknown[]
      const resultArray = result[key] as unknown[]

      result[key] = resultArray.map((value: unknown, idx: number) => {
        return typeof value === 'object' && value !== null
          ? deepMerge(targetArray[idx] as Record<string, unknown>, sourceArray[idx] as Record<string, unknown>)
          : structuredClone(resultArray[idx])
      })
    } else if (typeof target[key] === 'object' && target[key] !== null && typeof source[key] === 'object' && source[key] !== null) {
      result[key] = deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>)
    } else {
      result[key] = structuredClone(result[key])
    }
  }
  return result
}

export function removeTrailingSlash(path: string) {
  return path.replace(/\/+$/, '')
}
