# Code structure

## Monorepo

```sh
./
├── apps
│   ├── api
│   ├── docs
│   └── mcp
├── packages
│   ├── cli
│   ├── eslint-config
│   ├── logger
│   ├── playwright
│   ├── shared
│   ├── test-utils
│   └── ts-config
├── bun.lock
├── Makefile
└── package.json
```

## API

```sh
./apps/api
├── prisma
│   ├── schema.prisma           # Main config (generator, datasource)
│   ├── auth.prisma             # BetterAuth models (user, session, account, org, member, invitation, apiKey, jwks)
│   ├── audit.prisma            # Audit models (audit log)
│   ├── project.prisma          # Project model
│   └── migrations
├── src
│   ├── modules
│   │   ├── auth
│   │   │   ├── access-control.ts # Typed access control definitions (roles & resources)
│   │   │   ├── auth.ts          # BetterAuth instance (providers, plugins)
│   │   │   ├── bootstrap.ts     # Admin user bootstrap on first startup
│   │   │   ├── headers.ts       # Auth header helpers
│   │   │   ├── keycloak.ts      # Keycloak OIDC federation provider
│   │   │   ├── middleware.ts    # requireAuth / requireRole decorators
│   │   │   ├── redis.ts         # Redis session secondary storage
│   │   │   ├── router.ts        # /api/v1/auth/* catch-all route
│   │   │   └── index.ts         # AppModule definition
│   │   ├── audit
│   │   │   ├── index.ts         # AppModule definition
│   │   │   ├── logger.ts        # auditLogger decorator
│   │   │   ├── repository.ts    # Prisma-backed audit log repository
│   │   │   ├── schemas.ts       # Zod schemas for audit entries
│   │   │   └── types.ts         # Audit-specific types
│   │   ├── index.ts             # Module loader (setupModules)
│   │   └── types.ts             # AppModule interface + Fastify type augmentation
│   ├── prisma
│   ├── resources
│   │   ├── system
│   │   │   ├── index.ts
│   │   │   └── router.ts        # /healthz, /readyz, /livez, /version
│   │   ├── config
│   │   │   ├── constants.ts
│   │   │   ├── index.ts
│   │   │   ├── queries.ts       # WebSetting key='config' K-V
│   │   │   └── router.ts        # GET /config, PUT /config
│   │   ├── theme
│   │   │   ├── constants.ts
│   │   │   ├── index.ts
│   │   │   ├── queries.ts       # WebSetting key='theme' K-V
│   │   │   └── router.ts        # GET /theme, PUT /theme
│   │   └── projects
│   │       ├── business.ts
│   │       ├── index.ts
│   │       ├── queries.ts
│   │       └── router.ts
│   ├── utils
│   │   ├── configs              # Default config files
│   │   ├── config.ts            # Zod-validated env var config system
│   │   ├── errors.ts            # Typed APIError helper
│   │   ├── fastify.ts           # Fastify utility helpers
│   │   ├── functions.ts         # Pure utility functions
│   │   ├── index.ts             # Utils barrel export
│   │   ├── logger.ts            # Logger setup
│   │   ├── otel.ts              # OpenTelemetry SDK initialisation
│   │   └── prisma.ts            # Prisma client helpers
│   ├── app.ts
│   ├── database.ts
│   └── server.ts
├── Dockerfile
├── package.json
├── prisma.config.ts
├── tsconfig.json
└── vitest.config.ts
```

## Web

```sh
./apps/web
├── src
│   ├── assets
│   │   └── index.css            # Tailwind v4 theme (oklch color variables)
│   ├── components
│   │   └── ui                   # shadcn-vue primitives (button, card, dialog, input, label, table)
│   ├── layouts
│   │   ├── AuthLayout.vue       # Centered card layout for guest pages
│   │   └── DefaultLayout.vue    # Header + nav + main content slot
│   ├── lib
│   │   ├── api.ts               # Shared ApiClient instance
│   │   ├── auth.ts              # BetterAuth client (better-auth/vue)
│   │   └── utils.ts             # cn() helper (clsx + tailwind-merge)
│   ├── pages
│   │   ├── DashboardPage.vue
│   │   ├── LoginPage.vue
│   │   ├── ProfilePage.vue
│   │   ├── ProjectDetailPage.vue
│   │   ├── ProjectsPage.vue
│   │   ├── RegisterPage.vue
│   │   └── SettingsPage.vue     # Parent route for /settings/* children
│   ├── router
│   │   └── index.ts             # Vue Router config with auth guard
│   ├── stores
│   │   ├── auth.ts              # Pinia auth store (signIn, signUp, signOut, session)
│   │   ├── projects.ts          # Pinia projects store (CRUD via shared ApiClient)
│   │   └── theme.ts             # Pinia theme store (fetch, apply, preview)
│   ├── App.vue
│   └── main.ts
├── Dockerfile
├── nginx.conf
├── index.html
├── components.json              # shadcn-vue config
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Helm

```sh
./helm
├── charts
├── templates
│   ├── api
│   │   ├── clusterrole.yaml
│   │   ├── clusterrolebinding.yaml
│   │   ├── configmap.yaml
│   │   ├── deployment.yaml
│   │   ├── grpcroute.yaml
│   │   ├── hpa.yaml
│   │   ├── httproute.yaml
│   │   ├── ingress.yaml
│   │   ├── metrics.yaml
│   │   ├── networkpolicy.yaml
│   │   ├── pdb.yaml
│   │   ├── pullsecret.yml
│   │   ├── role.yaml
│   │   ├── rolebinding.yaml
│   │   ├── secret.yaml
│   │   ├── service.yaml
│   │   ├── serviceaccount.yaml
│   │   ├── servicemonitor.yaml
│   │   └── statefulset.yaml
│   ├── docs
│   │   └── ... (same structure as api)
│   ├── mcp
│   │   └── ... (same structure as api)
│   ├── web
│   │   └── ... (same structure as api)
│   ├── _helpers.tpl
│   ├── extra-objects.yaml
│   ├── gateway.yaml
│   ├── grafana-dashboards.yaml
│   ├── httproute.yaml
│   └── ingress.yaml
├── Chart.yaml
└── values.yaml
```

## Conventions

These conventions keep the codebase predictable as resources and modules are added. They are enforced by reviewers (and, where practical, lint rules — see `eslint.config.js`).

### Error emission

| Layer        | Style                                                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Routers**  | `reply.code(N).send({ message, error })` — already in the request lifecycle, no logger noise. Use for validation/auth/4xx that is part of the route's contract.                                   |
| **Business** | `throw new APIError(N, 'CODE', 'message', cause?)` — bubbles up to Fastify's error handler and is logged via `handleError`. Use for invariant violations and any error that should be observable. |
| **Queries**  | Let Prisma errors propagate. Don't wrap them — `handleError` recognises Prisma error classes.                                                                                                     |

The two styles are intentional: routers know the exact response they want to send, while business and query layers should not be coupled to HTTP semantics. New code should follow this split — if a router needs the same error code in multiple places, extract a small helper rather than throwing.

### Permission preHandler chains

Use `createProtection(app)` from `~/utils/protection.js` rather than inlining `[requireAuth, validate, ...]` arrays in route registrations:

```ts
const protect = createProtection(app)

// auth + validation
preHandler: protect.auth(routes.list)

// auth + validation + admin role
preHandler: protect.admin(routes.adminOnly)

// auth + validation + permission check (with optional preloaders)
preHandler: protect.permission(
  routes.deleteFoo,
  { permissions: { foo: ['delete'] }, getOwnerId, getOrganizationId },
  [preloadFoo],
)
```

For typed path params, use `getRouteParam(req, 'id')` instead of
`req.params as { id: string }`.

### Resource layout

Every resource under `apps/api/src/resources/<name>/` follows the same file split. Use `bunx cli generate resource <name>` (see `CLI docs`) to scaffold a new one.

```sh
resources/<name>/
├── business.ts        # orchestration, throws APIError
├── business.spec.ts
├── constants.ts       # message strings, magic numbers
├── index.ts           # router export
├── queries.ts         # Prisma calls only
├── queries.spec.ts
├── router.ts          # Fastify route registrations
└── router.spec.ts
```

