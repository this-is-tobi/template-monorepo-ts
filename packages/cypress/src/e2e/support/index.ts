import './commands.js'

Cypress.on('window:before:load', (win) => {
  let copyText: string
  Object.setPrototypeOf(win.navigator.clipboard, {
    writeText: async (text: string) => (copyText = text),
    readText: async () => copyText,
  })
})

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to assert clipboard value
       * @param value
       * @example cy.assertClipboard('test')
       */
      assertClipboard(
        value: string
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to get an html element by its 'data-testid'
       * @param dataTestid
       * @param timeout
       * @example cy.getByDataTestid('testBtn')
       */
      getByDataTestid(
        dataTestid: string,
        timeout?: number
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to delete window indexedDB 'localForage'
       * @example cy.deleteIndexedDB()
       */
      deleteIndexedDB(): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to access pinia store
       * @example cy.getStore()
       */
      getStore(): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to get an html element by its 'data-testid' with a retry system for flaky tests
       * @param selector
       * @param opt
       * @example cy.getSettled('testBtn')
       */
      getSettled(
        selector: string,
        opt?: {
          delay?: number
          retries?: number
        }
      ): void
    }
  }
}
