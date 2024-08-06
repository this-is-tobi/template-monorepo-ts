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

export function deepMerge(target: any, source: any) {
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
