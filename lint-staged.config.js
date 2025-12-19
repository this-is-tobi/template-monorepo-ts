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

    // Run eslint with package-specific config for each package
    return Array.from(packageCommands.entries()).map(
      ([packageDir, files]) => `eslint --config ${packageDir}/eslint.config.js --cache --max-warnings 0 ${files.join(' ')}`,
    )
  },
  '{.github,docker,helm}/**/*.{yaml,yml,md}': (filenames) => {
    return `eslint --cache --max-warnings 0 ${filenames.join(' ')}`
  },
  '!({apps,packages,.github,docker,helm})/**/*.{js,cjs,mjs,ts,json,md,yaml,yml}': (filenames) => {
    return `eslint --cache --max-warnings 0 ${filenames.join(' ')}`
  },
}
