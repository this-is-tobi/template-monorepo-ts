import { expect, test } from '@playwright/test'
import { env } from '~/tests/env.ts'

test('API health endpoint works', async ({ request }) => {
  // Make a request to the health endpoint
  const response = await request.get(`http://${env.apiHost}:${env.apiPort}/api/v1/healthz`)

  // Verify the response status
  expect(response.status()).toBe(200)

  // Verify the response body
  const body = await response.json()
  expect(body).toHaveProperty('status', 'OK')
})
