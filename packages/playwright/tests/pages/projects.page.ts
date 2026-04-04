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
    const row = this.projectRow(currentName)
    await row.getByRole('button', { name: /edit/i }).click()
    await this.editDialog.waitFor({ state: 'visible' })
    const nameInput = this.editDialog.getByLabel('Name')
    await nameInput.clear()
    await nameInput.fill(newName)
    if (newDescription !== undefined) {
      const descInput = this.editDialog.getByLabel('Description')
      await descInput.clear()
      await descInput.fill(newDescription)
    }
    await this.editDialog.getByRole('button', { name: /save/i }).click()
  }

  async deleteProject(name: string) {
    const row = this.projectRow(name)
    await row.getByRole('button', { name: /delete/i }).click()

    // Handle confirmation dialog
    const dialog = this.page.locator('[role="dialog"]').filter({ hasText: 'Delete project' })
    await dialog.waitFor({ state: 'visible' })
    await dialog.getByRole('button', { name: /delete/i }).click()
    await dialog.waitFor({ state: 'hidden' })
  }
}
