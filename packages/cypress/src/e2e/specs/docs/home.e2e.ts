const baseUrl = `http://${Cypress.env('docsHost')}:${Cypress.env('docsPort')}`

describe('Docs - Home', { baseUrl }, () => {
  it('Should display docs application title', () => {
    cy.intercept('/api/v1/version').as('getversion')

    cy.visit('/')
      .get('.clip')
      .should('contain', 'Project documentation')
  })
})
