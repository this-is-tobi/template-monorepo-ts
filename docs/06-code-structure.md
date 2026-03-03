# Code structure

## Monorepo

```sh
./
├── apps
│   ├── api
│   └── docs
├── packages
│   ├── eslint-config
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
│   └── migrations
├── src
│   ├── modules
│   │   ├── auth
│   │   │   ├── access-control.ts # Typed access control definitions (roles & resources)
│   │   │   ├── auth.ts          # BetterAuth instance (providers, plugins)
│   │   │   ├── bootstrap.ts     # Admin user bootstrap on first startup
│   │   │   ├── headers.ts       # Auth header helpers
│   │   │   ├── middleware.ts    # requireAuth / requireRole decorators
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
│   │   └── projects
│   │       ├── business.ts
│   │       ├── index.ts
│   │       ├── queries.ts
│   │       └── router.ts
│   ├── utils
│   │   ├── config.ts
│   │   ├── controller.ts
│   │   └── otel.ts
│   ├── app.ts
│   ├── database.ts
│   └── server.ts
├── Dockerfile
├── package.json
├── prisma.config.ts
├── tsconfig.json
└── vitest.config.ts
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
│   ├── _helpers.tpl
│   ├── extra-objects.yaml
│   ├── gateway.yaml
│   ├── httproute.yaml
│   └── ingress.yaml
├── Chart.yaml
└── values.yaml
```
