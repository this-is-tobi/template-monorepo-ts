import eslintConfigBase from '@template-monorepo-ts/eslint-config-base'
import vuePlugin from 'eslint-plugin-vue'
import cypressPlugin from 'eslint-plugin-cypress'

export default [
  ...eslintConfigBase,
  ...vuePlugin.configs['flat/recommended'],
  {
    plugins: {
      cypress: cypressPlugin
    },
    languageOptions: {
      parserOptions: {
        project: true,
        ecmaVersion: 'latest',
        sourceType: 'module',
        parser: '@typescript-eslint/parser',
      },
      globals: {
        'vue/setup-compiler-macros': true,
        'cypress/globals': true,
        browser: true,
      }
    },
    rules: {
      'vue/no-v-html': 0,
      'no-irregular-whitespace': 0
    },
    ignores: [
      '**/coverage',
      '**/eslint.config.js'
    ],
  },
]
