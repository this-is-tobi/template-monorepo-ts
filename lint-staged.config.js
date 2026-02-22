import { existsSync } from 'node:fs'

export default {
  '{apps,packages}/**/*.{js,cjs,mjs,ts,json,md}': (filenames) => {
    // Group files by their package directory
    const packageCommands = new Map()

    for (const filename of filenames) {
      // Handle both absolute and relative paths
      const relativePath = filename.includes('/template-monorepo-ts/')
        ? filename.split('/template-monorepo-ts/')[1]
        : filename

      const match = relativePath.match(/^((?:apps|packages)\/[^/]+)\//)
      if (match) {
        const packageDir = match[1]
        if (!packageCommands.has(packageDir)) {
          packageCommands.set(packageDir, [])
        }
        packageCommands.get(packageDir).push(filename)
      }
    }

    // Run eslint with package-specific config for each package (fall back to root config if none exists)
    return Array.from(packageCommands.entries()).map(
      ([packageDir, files]) => {
        const configFlag = existsSync(`${packageDir}/eslint.config.js`)
          ? `--config ${packageDir}/eslint.config.js `
          : ''
        return `eslint ${configFlag}--cache --no-warn-ignored --max-warnings 0 ${files.join(' ')}`
      },
    )
  },
  '{.github,docker,helm}/**/*.{yaml,yml,md}': (filenames) => {
    // Exclude Helm templates — they contain Go template syntax and are not valid YAML for eslint
    const filtered = filenames.filter(f => !f.includes('/helm/templates/'))
    if (filtered.length === 0) return []
    return `eslint --cache --no-warn-ignored --max-warnings 0 ${filtered.join(' ')}`
  },
  '!({apps,packages,.github,docker,helm})/**/*.{js,cjs,mjs,ts,json,md,yaml,yml}': (filenames) => {
    return `eslint --cache --no-warn-ignored --max-warnings 0 ${filenames.join(' ')}`
  },
}
