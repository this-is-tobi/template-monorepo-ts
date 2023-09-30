# Typescript monorepo template :camping:

This projects aims to provide an opinionated template structure for typescript monorepo with an API example structure.

## Prerequisites

The following softwares need to be install:
- [Helm](https://helm.sh/) *- package manager for kubernetes.*
- [Pnpm](https://pnpm.io/) *- powerful, space efficient nodejs package manager.*

## Developer experience

The following tools are provided with the template:
- [Commitlint](https://github.com/conventional-changelog/commitlint) *- commit message linter.*
- [Eslint](https://eslint.org/) *- javacript linter.*
- [Turbo](https://turbo.build/repo) *- repo building system with pipeline management.*

This model also includes vscode extension recommendations *(see [.vscode/extensions.json](.vscode/extensions.json))*.

## Template

### API

The API example is built on top of [Fastify](https://fastify.dev/), a powerful api framework that handles hooks and provides numerous plugins, including the following already in use:
- [@fastify/helmet](https://github.com/fastify/fastify-helmet)
- [@fastify/swagger](https://github.com/fastify/fastify-swagger)
- [@fastify/swagger-ui](https://github.com/fastify/fastify-swagger-ui)

### Shared resources

The `packages` folder can be used to share resources between different applications, and is already used to share `eslint` / `typescript` configurations and a `test-utils` utility package for testing. It can also be used to share utility functions, schemas and so on between different applications or packages.

### Tests

Unit tests are run using [Vitest](https://vitest.dev/), which is compatible with the Jest api but is faster when working on top of Vite.
Test execution may require some packages to be built, and the pipeline dependencies are described in the `turbo.json` file.

### Docs

Documentation is ready to write in the `./apps/docs` folder, it uses [Vitepress](https://vitepress.dev/), a static website generator using [Vite](https://vitejs.dev/) and [Vue](https://vuejs.org/) that will parse `.md` files to generate the documentation website.

### CI/CD

Default [Github Actions](https://docs.github.com/en/actions) workflows are already set to run some automated checks over 2 main files, the first one [ci.yml](./.github/workflows/ci.yml) run on pull request with the following tasks :
- Lint
- Unit Tests
- Code quality scan *- (Optional)* [1]
- Vulnerability scan [2]

> [1] Run code quality analysis using Sonarqube scanner, it only run if the secrets `SONAR_HOST_URL`, `SONAR_TOKEN`, `SONAR_PROJECT_KEY` are set in the repositry interface.
> 
> [2] Run only if changes occurs in `apps`, `packages` or `.github` folders and base branch is `main`.

The second file [cd.yml](./.github/workflows/cd.yml) is responsible to publish new release using [Release-please-action](https://github.com/google-github-actions/release-please-action) that automatically parse git history following [Conventionnal Commit](https://www.conventionalcommits.org/) to build changelog and version number (see. [Semantic versioning](https://semver.org/lang/fr/)). It can be triggered manually to run the following tasks :
- Create new release pull request / Create new git tag and github version
- Build application images and push them into a registry

> *__Notes:__ Uncomment on push trigger in `cd.yml` file to automatically create the new PR on merge into the main branch.*

### Deployment

An example of a Helm structure is provided in the `./helm` folder. This type of structure makes it easy to add another service with little effort by adding a new service folder in `./helm/templates` *(copy - paste an existing folder and replace the values)* and add a service block in [values.yaml](./helm/values.yaml`).

## Code structure

### Applications

Structure used for typescript applications :

```sh
./
├── apps
│   ├── api
│   └── docs
├── packages
│   ├── eslint-config
│   ├── test-utils
│   └── ts-config
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

### API

Structure used in the API example :

```sh
./apps/api
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

### Helm

Structure used for helm deployment :

```sh
./helm
├── templates
│   ├── api
│   │   ├── configmap.yaml
│   │   ├── deployment.yaml
│   │   ├── hpa.yaml
│   │   ├── ingress.yaml
│   │   ├── secret.yaml
│   │   └── service.yaml
│   ├── docs
│   │   ├── configmap.yaml
│   │   ├── deployment.yaml
│   │   ├── hpa.yaml
│   │   ├── ingress.yaml
│   │   ├── secret.yaml
│   │   └── service.yaml
│   ├── _helpers.tpl
│   ├── pullsecret.yml
│   └── serviceaccount.yaml
├── Chart.yaml
└── values.yaml
```

## Commands

Following commands are available through nodejs scripts *(see [package.json](package.json))* :

```sh
# Install dependencies
pnpm install

# Start development mode
pnpm run dev

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