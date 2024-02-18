describe('Swagger', () => {
  it('Should display swagger application name', () => {
    cy.visit('/swagger-ui')
      .get('h2')
      .should('contain', 'Fastify Template')
  })
})
