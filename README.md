# Typescript monorepo template :camping:

This projects aims to provide an opinionated template structure for typescript monorepo with an API example structure.

## Prerequisites

The following softwares need to be install:
- [Bun](https://bun.sh/) *- all-in-one JavaScript runtime & toolkit designed for speed, complete with a bundler, test runner, and Node.js-compatible package manager.*
- [Docker](https://docker.com/) *- software platform that lets you rapidly build, test and deploy applications using containers.*
- [Helm](https://helm.sh/) *- package manager for kubernetes.*
- [Kind](https://kind.sigs.k8s.io/) *- local Kubernetes clusters through Docker.*

## Developer experience

The following tools are provided with the template:
- [Commitlint](https://github.com/conventional-changelog/commitlint) *- commit message linter.*
- [Eslint](https://eslint.org/) *- javascript linter.*
- [Husky](https://typicode.github.io/husky/) *- git hooks wrapper.*
- [Turbo](https://turbo.build/repo) *- repo building system with pipeline management.*

This model also includes vscode extension recommendations *(see [.vscode/extensions.json](.vscode/extensions.json))*.

To get a better developer experience, install globally [Ni](https://github.com/antfu/ni), a Nodejs package manager wrapper:
```sh
npm install --location=global ni
```

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

End to end and component tests are powered by [Cypress](https://www.cypress.io/) and could be managed in the `./packages/cypress` folder.

> *__Notes:__* Test execution may require some packages to be built, and the pipeline dependencies are described in the `turbo.json` file.

### Docs

Documentation is ready to write in the `./apps/docs` folder, it uses [Vitepress](https://vitepress.dev/), a static website generator using [Vite](https://vitejs.dev/) and [Vue](https://vuejs.org/) that will parse `.md` files to generate the documentation website.

### CI/CD

Default [Github Actions](https://docs.github.com/en/actions) workflows are already set to run some automated checks over 2 main files, the first one [ci.yml](./.github/workflows/ci.yml) run on pull request with the following tasks :

| Description                                          | File                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Lint                                                 | [lint.yml](./.github/workflows/lint.yml)                                                                      |
| Unit tests *- (With optional code quality scan)* [1] | [tests-unit.yml](./.github/workflows/tests-unit.yml)                                                          |
| Build application images [2]                         | [build.yml](./.github/workflows/build.yml)                                                                    |
| End to end tests OR Deployment tests [3]             | [tests-e2e.yml](./.github/workflows/tests-e2e.yml) / [tests-deploy.yml](./.github/workflows/tests-deploy.yml) |
| Vulnerability scan [4]                               | [scan.yml](./.github/workflows/scan.yml)                                                                      |

> *__Notes:__*
> - [1] Run code quality analysis using Sonarqube scanner, it only run if the secrets `SONAR_HOST_URL`, `SONAR_TOKEN`, `SONAR_PROJECT_KEY` are set in the repositry interface.
>
> - [2] Build application images and tag them `pr-<pr_number>` before pushing them to a registry.
>
> - [3] Run e2e tests if changes occurs on apps, dependencies or helm / Run deployment tests if changes don't occurs in apps, dependencies or helm.
> 
> - [4] Run only if changes occurs in `apps`, `packages` or `.github` folders and base branch is `main`.

The second file [cd.yml](./.github/workflows/cd.yml) is responsible to publish new release using [Release-please-action](https://github.com/google-github-actions/release-please-action) that automatically parse git history following [Conventionnal Commit](https://www.conventionalcommits.org/) to build changelog and version number (see. [Semantic versioning](https://semver.org/lang/fr/)). It can be triggered manually to run the following tasks :

| Description                                                             | File                                           |
| ----------------------------------------------------------------------- | ---------------------------------------------- |
| Create new release pull request / Create new git tag and github release | [release.yml](./.github/workflows/release.yml) |
| Build application images and push them to a registry                    | [build.yml](./.github/workflows/build.yml)     |

> *__Notes:__ Uncomment on push trigger in `cd.yml` file to automatically create the new PR on merge into the main branch.*

All docker images are built in parallel using the [matrix.json](./ci/matrix.json) file, some options are available to build multi-arch with or whithout QEMU *(see. [build.yml](./.github/workflows/build.yml))*.

In addition, this template uses cache for Bun, Turbo and docker to improve CI/CD speed when it is possible. The cache is deleted when the associated pull request is closed or merged *(see. [cache.yml](./.github/workflows/cache.yml))*.

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
├── cypress
├── packages
│   ├── eslint-config
│   ├── test-utils
│   └── ts-config
└── package.json
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
bun install

# Start development mode
bun run dev

# Lint the code
bun run lint

# Format the code
bun run format

# Run unit tests
bun run test

# Run unit tests with coverage
bun run test:cov

# Run end to end tests
bun run test:e2e

# Run end to end tests (CI mode)
bun run kube:e2e-ci
```

For local kubernetes cluster, see :

```sh
# Setup prerequisite for kubernetes
bun run kube:init

# Build dev images for kubernetes
bun run kube:dev:build

# Start development mode in kubernetes
bun run kube:dev

# Build prod images for kubernetes
bun run kube:prod:build

# Remove app resources in kubernetes
bun run kube:clean

# Delete kubernetes cluster
bun run kube:delete

# Run end to end tests in kubernetes
bun run kube:e2e

# Run end to end tests in kubernetes (CI mode)
bun run kube:e2e-ci
```

> *__Notes:__ bun command can be used with filter flag to trigger a script in a given package.json (ex: `bun run --cwd <package_path> <script_name>`).*