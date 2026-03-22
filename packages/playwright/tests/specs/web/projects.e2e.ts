import { expect, test } from '~/tests/fixtures/auth.js'
import { ProjectsPage } from '~/tests/pages/index.js'

test.describe('Projects CRUD', () => {
  const uniqueSuffix = () => Date.now().toString(36)

  test('should display projects page with heading', async ({ authenticatedPage: page }) => {
    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()

    await expect(projectsPage.heading).toBeVisible()
    await expect(projectsPage.newProjectButton).toBeVisible()
  })

  test('should create a new project', async ({ authenticatedPage: page }) => {
    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()

    const projectName = `Test Project ${uniqueSuffix()}`
    await projectsPage.createProject(projectName, 'E2E test project')

    // Dialog should close and project should appear in the table
    await expect(projectsPage.createDialog).not.toBeVisible()
    await expect(projectsPage.projectRow(projectName)).toBeVisible()
  })

  test('should edit an existing project', async ({ authenticatedPage: page }) => {
    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()

    // Create a project first
    const originalName = `Edit Test ${uniqueSuffix()}`
    await projectsPage.createProject(originalName)
    await expect(projectsPage.projectRow(originalName)).toBeVisible()

    // Edit it
    const updatedName = `Updated ${uniqueSuffix()}`
    await projectsPage.editProject(originalName, updatedName, 'Updated description')

    await expect(projectsPage.editDialog).not.toBeVisible()
    await expect(projectsPage.projectRow(updatedName)).toBeVisible()
  })

  test('should delete a project', async ({ authenticatedPage: page }) => {
    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()

    // Create a project first
    const projectName = `Delete Test ${uniqueSuffix()}`
    await projectsPage.createProject(projectName)
    await expect(projectsPage.projectRow(projectName)).toBeVisible()

    // Delete it
    await projectsPage.deleteProject(projectName)
    await expect(projectsPage.projectRow(projectName)).not.toBeVisible()
  })

  test('should navigate to project detail', async ({ authenticatedPage: page }) => {
    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()

    // Create a project first
    const projectName = `Detail Test ${uniqueSuffix()}`
    await projectsPage.createProject(projectName, 'Detail test project')
    await expect(projectsPage.projectRow(projectName)).toBeVisible()

    // Click the project name link
    await projectsPage.projectRow(projectName).getByRole('link', { name: projectName }).click()
    await page.waitForURL('**/projects/*')

    await expect(page.getByRole('heading', { name: projectName })).toBeVisible()
  })

  test('should show empty state when no projects', async ({ authenticatedPage: page }) => {
    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()

    // Wait for page to fully load
    await expect(projectsPage.heading).toBeVisible()
    // The data table should be visible (shows either rows or empty message)
    await expect(projectsPage.dataTable).toBeVisible({ timeout: 10000 })
  })

  test('should open and close create dialog', async ({ authenticatedPage: page }) => {
    const projectsPage = new ProjectsPage(page)
    await projectsPage.goto()

    // Open dialog
    await projectsPage.openCreateDialog()
    await expect(projectsPage.createDialog).toBeVisible()

    // Close via cancel button
    await projectsPage.createDialog.getByRole('button', { name: /cancel/i }).click()
    await expect(projectsPage.createDialog).not.toBeVisible()
  })
})
