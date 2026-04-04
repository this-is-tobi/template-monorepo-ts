import { expect } from '@playwright/test'
import { test } from '~/tests/fixtures/api.js'
import {
  getConfig,
  getTheme,
  updateConfig,
  updateTheme,
} from '~/tests/helpers/index.js'

test.describe('Settings API', () => {
  test.describe('Config', () => {
    test('get config is public (no auth needed)', async ({ request }) => {
      const res = await getConfig(request)
      expect(res.ok()).toBe(true)

      const body = await res.json()
      expect(body.data).toBeTruthy()
      expect(typeof body.data.enableRegistration).toBe('boolean')
      expect(body.ssoProviders).toBeInstanceOf(Array)
    })

    test('admin can update config', async ({ adminApi }) => {
      const newConfig = {
        enableRegistration: false,
        allowOrganizationCreation: true,
        appName: 'E2E Updated App',
        documentationUrl: '',
        maintenanceMode: false,
        maxOrganizationsPerUser: null,
      }

      const res = await updateConfig(adminApi, newConfig)
      expect(res.ok()).toBe(true)

      const body = await res.json()
      expect(body.data.appName).toBe('E2E Updated App')
      expect(body.data.enableRegistration).toBe(false)

      // Restore registration for other tests
      await updateConfig(adminApi, { ...newConfig, enableRegistration: true, appName: 'Template Monorepo TS' })
    })

    test('unauthenticated user cannot update config', async ({ request }) => {
      const res = await updateConfig(request, { enableRegistration: true })
      expect(res.ok()).toBe(false)
    })
  })

  test.describe('Theme', () => {
    test('get theme is public (no auth needed)', async ({ request }) => {
      const res = await getTheme(request)
      expect(res.ok()).toBe(true)

      const body = await res.json()
      expect(body.data).toBeTruthy()
    })

    test('admin can update theme', async ({ adminApi }) => {
      const newTheme = {
        primaryColor: 'indigo',
        surfaceColor: 'slate',
      }

      const res = await updateTheme(adminApi, newTheme)
      expect(res.ok()).toBe(true)

      const body = await res.json()
      expect(body.data.primaryColor).toBe('indigo')
      expect(body.data.surfaceColor).toBe('slate')
    })

    test('unauthenticated user cannot update theme', async ({ request }) => {
      const res = await updateTheme(request, { primaryColor: 'red', surfaceColor: 'zinc' })
      expect(res.ok()).toBe(false)
    })
  })
})
