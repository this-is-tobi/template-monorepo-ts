describe('Swagger', () => {
  it('Should display swagger application name', () => {
    cy.visit('/api/v1/documentation')
      .get('h2')
      .should('contain', 'Fastify Template')
  })
})
