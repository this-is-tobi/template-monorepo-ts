# Customization Guide

This template is designed to be trimmed down or extended. Start by deciding what you need, then remove or customize accordingly.

## What's optional

| Component             | Purpose                | Remove if...                                               |
| --------------------- | ---------------------- | ---------------------------------------------------------- |
| `apps/web`            | Vue 3 frontend         | Building an API-only service or using a different frontend |
| `apps/mcp`            | AI assistant tools     | Not using AI integrations                                  |
| `apps/docs`           | Documentation site     | Using external docs or none                                |
| `packages/cli`        | Command-line interface | No CLI needed                                              |
| `packages/playwright` | E2E tests              | Not testing the web app                                    |
| `packages/ui`         | Shared UI preset       | No web frontend                                            |

**Always keep**: `apps/api`, `packages/shared`, `packages/logger`, `packages/eslint-config`, `packages/ts-config`, `packages/test-utils`.

## Removing components

### API-only setup

```bash
# Remove frontend and CLI
rm -rf apps/web apps/docs apps/mcp packages/cli packages/playwright packages/ui

# Update turbo.json - remove tasks referencing deleted apps
# Update package.json - remove workspace references
# Update docker-compose files - remove web/docs/mcp services
# Update helm/ - remove web/docs/mcp templates
```

Update `turbo.json`:

```jsonc
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"]
      // Remove apps/web, apps/docs from outputs
    }
  }
}
```

### Keeping specific apps

If you only need API + Web (no CLI, no MCP):

```bash
rm -rf apps/mcp packages/cli
# Update turbo.json, docker-compose, helm accordingly
```

## Replacing the example domain

The `project` resource is a **placeholder**. Replace it with your actual domain:

### 1. Rename resource files

```bash
# Rename the resource folder
mv apps/api/src/resources/projects apps/api/src/resources/products

# Rename files inside
mv products/projects.ts products/products.ts
# etc.
```

### 2. Update Prisma schema

Replace `project.prisma` content:

```prisma
// apps/api/prisma/product.prisma

model Product {
  id             String   @id @default(uuid())
  name           String
  description    String?
  price          Decimal
  ownerId        String
  organizationId String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([ownerId])
  @@index([organizationId])
  @@map("product")
}
```

Then regenerate:

```bash
bunx prisma generate
bunx prisma migrate dev --name add_products
```

### 3. Update access control

Edit `apps/api/src/modules/auth/access-control.ts`:

```ts
export const accessControl = createAccessControl({
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'update', 'delete'],
  role: ['create', 'read', 'update', 'delete'],
  // Replace project with your resource
  product: ['create', 'read', 'update', 'delete'],
  setting: ['read', 'update'],
  audit: ['read'],
})
```

Update role definitions (`ownerRole`, `adminRole`, `memberRole`) accordingly.

### 4. Update routes

Rename and edit route files to use your new resource.

## Adding new resources

Follow this pattern for each new domain resource:

### 1. Create resource folder

```txt
apps/api/src/resources/orders/
├── index.ts        # Re-exports
├── router.ts       # Fastify routes
├── business.ts     # Business logic (pure functions)
├── queries.ts      # Database queries
├── schemas.ts      # Zod validation schemas
├── constants.ts    # Resource constants
└── business.spec.ts # Tests
```

### 2. Add to access control

```ts
// access-control.ts
export const accessControl = createAccessControl({
  // ... existing
  order: ['create', 'read', 'update', 'delete', 'cancel'],
})
```

### 3. Add Prisma model

Create `apps/api/prisma/order.prisma`:

```prisma
model Order {
  id             String      @id @default(uuid())
  // ... your fields
  ownerId        String
  organizationId String?

  @@index([ownerId])
  @@index([organizationId])
  @@map("order")
}
```

### 4. Register routes

```ts
// apps/api/src/resources/index.ts
import orderRoutes from './orders/router.js'

export async function registerResources(app: FastifyInstance) {
  await app.register(projectRoutes, { prefix: '/projects' })
  await app.register(orderRoutes, { prefix: '/orders' })  // Add
}
```

## Customizing authentication

### Disable features

Edit `apps/api/src/modules/auth/index.ts`:

```ts
const auth = betterAuth({
  // Remove plugins you don't need
  plugins: [
    // twoFactor(),        // Remove for no 2FA
    // organization(),     // Remove for single-tenant
    // apiKey(),           // Remove if no API keys needed
    bearer(),              // Keep for session auth
    openAPI(),             // Keep for Swagger
  ],
})
```

**Single-tenant mode**: Remove `organization()` plugin and update permission middleware to skip org context.

### Enable Keycloak SSO

Set env vars:

```bash
AUTH__KEYCLOAK__ENABLED=true
AUTH__KEYCLOAK__ISSUER=https://keycloak.example.com/realms/myrealm
AUTH__KEYCLOAK__CLIENT_ID=my-client
AUTH__KEYCLOAK__CLIENT_SECRET=***
```

## Customizing modules

### Disable audit

```bash
MODULES__AUDIT=false
```

When disabled, `app.auditLogger` is a no-op — no code changes needed.

### Add a new module

1. Create folder: `apps/api/src/modules/billing/`
2. Implement `AppModule` interface:

```ts
// apps/api/src/modules/billing/index.ts
import type { AppModule } from '~/types/module.js'

export const billingModule: AppModule = {
  name: 'billing',

  register: async (app) => {
    // Register routes, decorators
    app.decorate('billing', billingService)
  },

  onReady: async (app) => {
    // Initialize after server starts
  },

  onClose: async (app) => {
    // Cleanup on shutdown
  },
}
```

3. Register in `apps/api/src/modules/index.ts`:

```ts
import { billingModule } from './billing/index.js'

export const modules: AppModule[] = [
  authModule,
  auditModule,
  billingModule,  // Add
]
```

4. Add toggle:

```ts
// config.ts
modules: {
  audit: env.MODULES__AUDIT !== 'false',
  billing: env.MODULES__BILLING === 'true',  // Add
},
```

## Customizing the web app

### Remove PrimeVue

If using a different UI framework:

```bash
# In apps/web
bun remove primevue @primeuix/themes
rm -rf src/components/prime*
```

Update `src/main.ts` to remove PrimeVue imports.

### Change theming

Edit `packages/ui/src/theme.ts` for PrimeVue preset, or `apps/web/src/assets/main.css` for Tailwind.

## Helm customizations

### API-only deployment

```yaml
# helm/values.yaml
web:
  enabled: false
docs:
  enabled: false
mcp:
  enabled: false
```

### External database

```yaml
api:
  env:
    DATABASE_URL: "postgresql://user:pass@external-db:5432/mydb"

cnpg:
  enabled: false
```

### External Redis

```yaml
api:
  env:
    AUTH__REDIS_URL: "redis://external-redis:6379"

redis:
  enabled: false
```

## Common customization scenarios

| Scenario               | Actions                                                |
| ---------------------- | ------------------------------------------------------ |
| **SaaS multi-tenant**  | Keep everything, enable orgs, add quotas               |
| **Internal API**       | Remove web/mcp/cli, disable public signup              |
| **Single-tenant app**  | Remove org plugin, simplify permissions                |
| **Headless CMS API**   | Replace project with content types, add media resource |
| **E-commerce backend** | Add product, order, payment resources                  |

## Checklist after customization

- [ ] Update `package.json` workspace paths
- [ ] Update `turbo.json` pipeline
- [ ] Run `bun install` to refresh lockfile
- [ ] Run `bunx prisma generate`
- [ ] Run `bun run compile` (no type errors)
- [ ] Run `bun run test` (all pass)
- [ ] Update `docker-compose.*.yml`
- [ ] Update `helm/values.yaml`
- [ ] Update `README.md`
