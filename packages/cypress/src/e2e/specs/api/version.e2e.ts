describe('API - /version', () => {
  it('Should display application version', () => {
    cy.intercept('/api/v1/version').as('getversion')

    cy.request('/api/v1/version').then(response => {
      expect(response?.status).to.eq(200)
      expect(response?.body.version).to.eq('dev')
    })
  })
})
