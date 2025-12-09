export default {
  '{apps,packages}/**/*.{js,cjs,mjs,ts,json,md}': (filenames) => {
    return `eslint --cache --max-warnings 0 ${filenames.join(' ')}`
  },
  '{.github,docker,helm}/**/*.{yaml,yml,md}': (filenames) => {
    return `eslint --cache --max-warnings 0 ${filenames.join(' ')}`
  },
  '*.{js,cjs,mjs,ts,json,md,yaml,yml}': (filenames) => {
    return `eslint --cache --max-warnings 0 ${filenames.join(' ')}`
  },
}
