Cypress.Commands.add('assertClipboard', (value) => {
  cy.window().then((win) => {
    win.navigator.clipboard.readText().then((text) => {
      expect(text).to.contain(value)
    })
  })
})

Cypress.Commands.add('getByDataTestid', (dataTestid, timeout = 4_000) => {
  cy.get(`[data-testid="${dataTestid}"]`, { timeout })
})

Cypress.Commands.add('deleteIndexedDB', () => {
  Cypress.on('window:before:load', (win) => {
    win.indexedDB.deleteDatabase('localforage')
  })
})

Cypress.on('uncaught:exception', (_err, _runnable) => false)

// Commande pour accéder / interagir avec le store dans les tests
Cypress.Commands.add('getStore', () => cy.window().its('app.$store'))
