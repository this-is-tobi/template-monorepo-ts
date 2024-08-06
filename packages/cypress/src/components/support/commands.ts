import { mount } from '@cypress/vue'
import type { Plugin } from 'vue'

Cypress.Commands.add('mount', (component, options = {}) => {
  // Setup options object
  options.global = options.global ?? {}
  options.global.components = options.global.components ?? {}
  options.global.plugins = options.global.plugins ?? []

  const globalPlugins: Plugin[] = []

  options.global.plugins.push({
    install(app) {
      globalPlugins.forEach(plugin => app.use(plugin))
    },
  })

  return mount(component, options)
})

Cypress.Commands.add('getByDataTestid', (dataTestid) => {
  cy.get(`[data-testid="${dataTestid}"]`)
})
