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
  const result: Record<string, unknown> = {}

  // Collect all keys from both target and source
  const allKeys = new Set([...Object.keys(target), ...Object.keys(source)])

  for (const key of allKeys) {
    const targetValue = target[key]
    const sourceValue = source[key]

    // Key only in target
    if (!(key in source)) {
      result[key] = structuredClone(targetValue)
      continue
    }

    // Key only in source
    if (!(key in target)) {
      result[key] = structuredClone(sourceValue)
      continue
    }

    // Both are arrays — merge element-wise, source wins for extra items
    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      const maxLen = Math.max(targetValue.length, sourceValue.length)
      result[key] = Array.from({ length: maxLen }, (_, idx) => {
        const tItem = targetValue[idx]
        const sItem = sourceValue[idx]

        if (idx >= sourceValue.length) {
          return structuredClone(tItem)
        }
        if (idx >= targetValue.length) {
          return structuredClone(sItem)
        }
        if (typeof tItem === 'object' && tItem !== null && typeof sItem === 'object' && sItem !== null && !Array.isArray(tItem) && !Array.isArray(sItem)) {
          return deepMerge(tItem as Record<string, unknown>, sItem as Record<string, unknown>)
        }
        return structuredClone(sItem)
      })
      continue
    }

    // Both are plain objects — recurse
    if (typeof targetValue === 'object' && targetValue !== null && typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(targetValue) && !Array.isArray(sourceValue)) {
      result[key] = deepMerge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>)
      continue
    }

    // Primitive or type mismatch — source wins
    result[key] = structuredClone(sourceValue)
  }

  return result
}

export function removeTrailingSlash(path: string) {
  return path.replace(/\/+$/, '')
}
