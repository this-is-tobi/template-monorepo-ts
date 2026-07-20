# Code structure

## Monorepo

```sh
./
├── apps
│   ├── api
│   ├── docs
│   ├── mcp
│   └── web
├── packages
│   ├── cli
│   ├── eslint-config
│   ├── k6
│   ├── logger
│   ├── playwright
│   ├── shared
│   ├── test-utils
│   ├── ts-config
│   └── ui
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
│   │   ├── database.ts          # Database helpers
│   │   ├── errors.ts            # Typed APIError helper
│   │   ├── fastify.ts           # Fastify utility helpers
│   │   ├── functions.ts         # Pure utility functions
│   │   ├── index.ts             # Utils barrel export
│   │   ├── logger.ts            # Logger setup
│   │   ├── otel.ts              # OpenTelemetry SDK initialisation
│   │   └── prisma.ts            # Prisma client helpers
│   ├── app.ts
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
│   │   └── index.css            # PrimeVue + Tailwind integration (design tokens, dark mode)
│   ├── components
│   │   ├── ColorSwatchPicker.vue # Visual palette picker (theme settings)
│   │   ├── CommandPalette.vue   # ⌘K palette — navigation, actions, org switching
│   │   ├── OrgMembersTable.vue  # Reusable org members data table
│   │   ├── ProjectsTable.vue    # Reusable projects data table
│   │   ├── SidebarLink.vue      # Nav link (icon + label), one style for all entries
│   │   └── settings             # Settings sub-page components
│   │       ├── SettingsConfig.vue
│   │       ├── SettingsGeneral.vue
│   │       └── SettingsTheme.vue
│   ├── composables
│   │   ├── useNotify.ts         # Toast feedback wrapper (success / info / error)
│   │   ├── useOrgLookup.ts      # Organization search/lookup composable
│   │   └── useUserLookup.ts     # User search/lookup composable
│   ├── layouts
│   │   ├── AuthLayout.vue       # Centered card layout for guest pages
│   │   └── DefaultLayout.vue    # Header + nav + main content slot
│   ├── lib
│   │   ├── api.ts               # Shared ApiClient instance
│   │   ├── auth.ts              # BetterAuth client (better-auth/vue)
│   │   ├── config.ts            # Runtime config (API URL, resolved from env or config.js)
│   │   └── navigation.ts        # Nav config — single source for sidebar + command palette
│   ├── pages
│   │   ├── AdminOrganizationDetailPage.vue  # Admin: org detail with members
│   │   ├── AdminProjectDetailPage.vue       # Admin: project detail (any owner)
│   │   ├── ApiKeyDetailPage.vue             # API key detail / edit
│   │   ├── ApiKeysPage.vue                  # User API keys list
│   │   ├── AuditPage.vue                    # Audit log viewer (admin)
│   │   ├── DashboardPage.vue
│   │   ├── LoginPage.vue
│   │   ├── MaintenancePage.vue              # Shown when PLATFORM__MAINTENANCE_MODE=true
│   │   ├── OrganizationDetailPage.vue       # User: org detail with members
│   │   ├── OrganizationsPage.vue
│   │   ├── ProfilePage.vue
│   │   ├── ProjectDetailPage.vue
│   │   ├── ProjectsPage.vue
│   │   ├── RegisterPage.vue
│   │   ├── SettingsPage.vue                 # Parent route for /settings/* children
│   │   ├── UserDetailPage.vue               # Admin: user detail with related resources
│   │   └── UsersPage.vue                    # Admin: all users list
│   ├── router
│   │   └── index.ts             # Vue Router config with auth + admin guards
│   ├── stores
│   │   ├── admin-api-keys.ts    # Admin: all API keys (paginated)
│   │   ├── admin-organizations.ts # Admin: all organizations (paginated)
│   │   ├── admin-users.ts       # Admin: all users (paginated)
│   │   ├── api-keys.ts          # User: own API keys CRUD
│   │   ├── audit.ts             # Audit log queries
│   │   ├── auth.ts              # Pinia auth store (signIn, signUp, signOut, session)
│   │   ├── config.ts            # Platform config store (fetch, update)
│   │   ├── organizations.ts     # User: own organizations CRUD
│   │   ├── projects.ts          # Pinia projects store (CRUD via shared ApiClient)
│   │   ├── roles.ts             # Org custom roles store
│   │   └── theme.ts             # Pinia theme store (fetch, apply, preview)
│   ├── types/
│   ├── App.vue
│   └── main.ts
├── Dockerfile
├── nginx.conf
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Web UI building blocks

- **Design tokens** — `assets/index.css` bridges PrimeVue's `--p-*` variables into a small `--app-*` set (`bg`, `surface`, `fg`, `muted`, `border`, `radius`). Components use only `--app-*` (or Tailwind `surface-*` utilities), so admin theme changes propagate everywhere at runtime.
- **Theming** — the platform theme (primary/surface palette, logo, optional raw preset) is admin-editable under Settings → Theme with live preview, persisted via the `theme` API resource. Dark mode is a per-user choice (localStorage) that overrides the OS preference; without an explicit choice the app follows the system live.
- **Icons** — [lucide-vue-next](https://lucide.dev), tree-shaken per import. No inline SVGs; nav icons are declared once in `lib/navigation.ts`.
- **Navigation** — `lib/navigation.ts` is the single source of truth consumed by the sidebar (`SidebarLink`) and the ⌘K `CommandPalette`. Adding an entry there updates both.
- **Command palette** — ⌘K / Ctrl-K anywhere. Fuzzy-matches navigation, org switching, dark-mode toggle, sign-out, and admin routes (role-filtered). Add commands in `CommandPalette.vue`'s `commands` computed.
- **Feedback** — `useNotify()` (toast wrapper) for action results, PrimeVue `useConfirm()` for destructive actions. `Toast` and `ConfirmDialog` are mounted once in `App.vue`; the test helper installs both services.
- **Typography** — Geist Sans / Geist Mono, self-hosted via `@fontsource` (no external requests). `font-mono` is for machine identifiers (IDs, slugs, key prefixes); headings get `-0.02em` tracking globally.
- **Motion** — router-level page transitions (`.page-*` classes), skeleton shimmer loaders (`.skeleton` utility, `PageSkeleton` for detail pages), all under 200ms and disabled by `prefers-reduced-motion`.
- **Light as depth** — `.bg-hero-glow` (accent radial glow) and `.bg-dot-grid` backdrops (auth pages), `.card-hover` border-lightening on interactive cards, `.text-gradient` for brand headings. `GradientAvatar` derives a stable per-user gradient from the user id — no image storage needed.

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

