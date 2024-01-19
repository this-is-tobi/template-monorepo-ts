import { mount } from '@cypress/vue'
import type { Plugin } from 'vite'

Cypress.Commands.add('mount', (component, options = {}) => {
  // Setup options object
  options.global = options.global ?? {}
  options.global.components = options.global.components ?? {}
  options.global.plugins = options.global.plugins ?? []

  const globalPlugins: Plugin[] = []

  options.global.plugins.push({
    install (app) {
      // @ts-ignore
      globalPlugins.forEach(plugin => app.use(plugin))
    },
  })

  return mount(component, options)
})

Cypress.Commands.add('getByDataTestid', (dataTestid) => {
  cy.get(`[data-testid="${dataTestid}"]`)
})
