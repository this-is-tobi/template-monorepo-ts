# Typescript monorepo template :camping:

This projects aims to provide an opinionated template structure for typescript monorepo with an API example structure.

## Tools

### Developer experience

The following tools are provided with the template:
- [Commitlint](https://github.com/conventional-changelog/commitlint) *- commit message linter.*
- [Eslint](https://eslint.org/) *- javacript linter.*
- [Pnpm](https://pnpm.io/) *- powerful, space efficient node package manager.*
- [Turbo](https://turbo.build/repo) *- repo building system with pipeline management.*

This model also includes vscode extension recommendations *(see [.vscode/extensions.json](.vscode/extensions.json))*.

### API

The API example is built on top of [Fastify](https://fastify.dev/), a powerful api framework that handles hooks and provides numerous plugins, including the following already in use:
- [@fastify/helmet](https://github.com/fastify/fastify-helmet)
- [@fastify/swagger](https://github.com/fastify/fastify-swagger)
- [@fastify/swagger-ui](https://github.com/fastify/fastify-swagger-ui)

### Shared resources

The `packages` folder can be used to share resources between different applications, and is already used to share `eslint` / `typescript` configurations and a `test-utils` utility package for testing. It can also be used to share utility functions, schemas and so on between different applications or packages.

### Tests

This repository uses [Vitest](https://vitest.dev/) for unit testing, it is compatible with the Jest api but is faster when working on top of Vite.
Test execution may require some packages to be built, and the pipeline dependencies are described in the `turbo.json` file.

## Structures

### Repository

```sh
├── apps
│   └── api
├── packages
│   ├── eslint-config
│   ├── test-utils
│   └── ts-config
├── README.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── turbo.json
```

### API

```sh
├── src
│   ├── resources
│   │   └── example
│   │       ├── utils
│   │       ├── controllers.ts
│   │       ├── router.spec.ts
│   │       ├── router.ts
│   │       └── schemas.ts
│   ├── types
│   ├── utils
│   ├── app.ts
│   ├── server.spec.ts
│   └── server.ts
├── Dockerfile
├── package.json
├── tsconfig.build.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Commands

Following commands are available through nodejs scripts *(see [package.json](package.json))* :

```sh
# Lint the code
pnpm run lint

# Format the code
pnpm run format

# Run unit tests
pnpm run test

# Run unit tests with coverage
pnpm run test:cov
```

> *__Notes:__ pnpm command can be used with filter flag to trigger a script in a given package.json (ex: `pnpm --filter <package_name> run <script_name>`).*