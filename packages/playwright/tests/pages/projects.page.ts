import type { Locator, Page } from '@playwright/test'

export class ProjectsPage {
  readonly page: Page
  readonly heading: Locator
  readonly newProjectButton: Locator
  readonly dataTable: Locator
  readonly emptyMessage: Locator
  readonly createDialog: Locator
  readonly editDialog: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: 'Projects' })
    this.newProjectButton = page.getByRole('button', { name: /new project/i })
    this.dataTable = page.locator('.p-datatable')
    this.emptyMessage = page.locator('text=No projects yet')
    this.createDialog = page.locator('[role="dialog"]').filter({ hasText: 'Create project' })
    this.editDialog = page.locator('[role="dialog"]').filter({ hasText: 'Edit project' })
  }

  async goto() {
    await this.page.goto('/projects')
  }

  async openCreateDialog() {
    await this.newProjectButton.click()
    await this.createDialog.waitFor({ state: 'visible' })
  }

  async createProject(name: string, description?: string) {
    await this.openCreateDialog()
    await this.createDialog.getByLabel('Name').fill(name)
    if (description) {
      await this.createDialog.getByLabel('Description').fill(description)
    }
    await this.createDialog.getByRole('button', { name: /create/i }).click()
  }

  projectRow(name: string) {
    return this.page.locator('tr').filter({ hasText: name })
  }

  async editProject(currentName: string, newName: string, newDescription?: string) {
    // Navigate to project detail page via the name link
    await this.projectRow(currentName).getByRole('link', { name: currentName }).click()
    await this.page.waitForURL('**/projects/*')
    // Click the Settings tab
    await this.page.getByRole('tab', { name: /settings/i }).click()
    // Update name
    const nameInput = this.page.locator('#edit-name')
    await nameInput.clear()
    await nameInput.fill(newName)
    if (newDescription !== undefined) {
      const descInput = this.page.locator('#edit-description')
      await descInput.clear()
      await descInput.fill(newDescription)
    }
    await this.page.getByRole('button', { name: /save changes/i }).click()
    // Wait for the PUT request to complete, then check the heading
    await this.page.waitForResponse(
      res => res.url().includes('/projects/') && res.request().method() === 'PUT',
      { timeout: 30000 },
    )
    await this.page.getByRole('heading', { name: newName, level: 1 }).waitFor({ state: 'visible' })
    // Navigate back to the projects list
    await this.page.goto('/projects')
  }

  async deleteProject(name: string) {
    // Navigate to project detail page via the name link
    await this.projectRow(name).getByRole('link', { name }).click()
    await this.page.waitForURL('**/projects/*')
    // Click the Settings tab
    await this.page.getByRole('tab', { name: /settings/i }).click()
    // Click the danger-zone Delete button
    await this.page.getByRole('button', { name: 'Delete' }).click()
    // Confirm in the dialog
    const dialog = this.page.locator('[role="dialog"]').filter({ hasText: 'Delete project' })
    await dialog.waitFor({ state: 'visible' })
    await dialog.getByRole('button', { name: 'Delete' }).click()
    // App navigates back to the projects list after deletion
    await this.page.waitForURL('**/projects')
  }
}
