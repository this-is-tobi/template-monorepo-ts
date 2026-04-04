import { faker } from '@faker-js/faker'

/**
 * Generate unique test user credentials.
 */
export function generateUser() {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    password: faker.internet.password({ length: 16, memorable: false }),
  }
}

/**
 * Generate a project payload.
 */
export function generateProject() {
  return {
    name: `${faker.commerce.productName()} ${faker.string.nanoid(6)}`,
    description: faker.lorem.sentence(),
  }
}

/**
 * Generate an organization payload.
 */
export function generateOrganization() {
  const name = `${faker.company.name()} ${faker.string.nanoid(6)}`
  return {
    name,
    slug: faker.helpers.slugify(name).toLowerCase(),
  }
}

/**
 * Generate an API key payload.
 */
export function generateApiKey() {
  return {
    name: `key-${faker.string.nanoid(8)}`,
  }
}
