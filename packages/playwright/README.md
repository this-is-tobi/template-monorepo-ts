# Playwright Tests

This package contains [Playwright](https://playwright.dev/) end-to-end tests for the monorepo.

## Getting Started

1. Install dependencies:
   ```bash
   bun install
   ```

2. Install Playwright browsers:
   ```bash
   bun run test:e2e:install
   # or from within this package:
   bun run install:browsers
   ```

## Running Tests

### Running all tests:
```bash
# From repository root:
bun run test:e2e

# From this package:
bun run test
```

### Running tests in UI mode:
```bash
# From repository root:
bun run test:e2e:ui

# From this package:
bun run test:ui
```

### Running tests in headed mode (with visible browser):
```bash
bun run test:headed
```

### Debugging tests:
```bash
bun run test:debug
```

### View the last HTML report:
```bash
bun run show-report
```

## Project Structure

- `playwright.config.ts` - Playwright configuration file
- `tests/` - Test files
  - `*.spec.ts` - Test files
  - `pages/` - Page Object Models
  - `fixtures/` - Custom test fixtures

## Page Object Model

We're using the Page Object Model pattern to organize test code. Page objects are in the `tests/pages/` directory.

Example usage:
```typescript
import { test, expect } from '@playwright/test'
import { HomePage } from './pages/home-page'

test('navigation works', async ({ page }) => {
  const homePage = new HomePage(page)
  await homePage.goto()

  await homePage.clickNavLink('Dashboard')
  await expect(page).toHaveURL(/.*dashboard/)
})
```

## Custom Fixtures

Custom fixtures are in the `tests/fixtures/` directory. They provide a way to reuse common setup/teardown code.

Example usage:
```typescript
import { test, expect } from './fixtures/test-fixtures'

test('using custom fixture', async ({ homePage, page }) => {
  await homePage.goto()
  // Test using the homePage fixture
})
```
