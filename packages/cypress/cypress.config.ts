import path from 'node:path'
import { defineConfig } from 'cypress'
import vitePreprocessor from 'cypress-vite'
import viteConfig from './vite.config.js'
import { env } from './src/env.js'

if (viteConfig.server) {
  viteConfig.server.host = '127.0.0.1'
  viteConfig.server.port = 9999
}

const host = typeof env.defaultHost === 'string'
  ? env.defaultHost
  : env.defaultHost()
const port = typeof env.defaultPort === 'string'
  ? env.defaultPort
  : env.defaultPort()

export default defineConfig({
  e2e: {
    setupNodeEvents (on) {
      on(
        'file:preprocessor',
        vitePreprocessor({
          configFile: path.resolve('./vite.config.ts'),
          mode: 'development',
        }),
      )
    },
    baseUrl: `http://${host}:${port}`,
    fixturesFolder: 'src/e2e/fixtures',
    specPattern: 'src/e2e/specs/**/*.{cy,e2e}.{j,t}s',
    supportFile: 'src/e2e/support/index.ts',
    screenshotsFolder: 'src/e2e/screenshots',
    downloadsFolder: 'src/e2e/downloads',
    video: false,
    numTestsKeptInMemory: 3,
    chromeWebSecurity: false,
    experimentalModifyObstructiveThirdPartyCode: false,
    experimentalWebKitSupport: false,
    env,
  },

  component: {
    specPattern: 'src/components/specs/**/*.{cy,ct}.{j,t}s',
    supportFile: 'src/components/support/index.ts',
    indexHtmlFile: 'src/components/support/component-index.html',
    screenshotsFolder: 'src/components/screenshots',
    downloadsFolder: 'src/components/downloads',
    video: false,
    numTestsKeptInMemory: 3,
    devServer: {
      framework: 'vue',
      bundler: 'vite',
      viteConfig,
    },
  },
})
