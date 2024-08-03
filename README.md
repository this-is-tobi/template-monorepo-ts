# Typescript monorepo template :camping:

This projects aims to provide an opinionated template structure for typescript monorepo with an API example structure.

## Prerequisites

The following softwares need to be install:
- [Bun](https://bun.sh/) *- all-in-one JavaScript runtime & toolkit designed for speed, complete with a bundler, test runner, and Node.js-compatible package manager.*
- [Docker](https://docker.com/) *- software platform that lets you rapidly build, test and deploy applications using containers.*
- [Helm](https://helm.sh/) *- package manager for Kubernetes.*
- [Kind](https://kind.sigs.k8s.io/) *- local Kubernetes clusters through Docker.*
- [kubectl](https://github.com/kubernetes/kubectl) *- command-line tool to deploy and manage applications in Kubernetes.*

## Developer experience

The following tools are provided with the template:
- [Commitlint](https://github.com/conventional-changelog/commitlint) *- commit message linter.*
- [Eslint](https://eslint.org/) *- javascript linter.*
- [Husky](https://typicode.github.io/husky/) *- git hooks wrapper.*
- [Proto](https://moonrepo.dev/proto) *- javascript toolchain.*
- [Turbo](https://turbo.build/repo) *- repo building system with pipeline management.*

This model also includes recommendations for vscode settings and extensions *(see [.vscode/settings.json](.vscode/settings.json) and [.vscode/extensions.json](.vscode/extensions.json))*.

To get a better developer experience, install globally [Ni](https://github.com/antfu/ni), a Nodejs package manager wrapper:
```sh
bun install --global @antfu/ni
```

## Template

### API

The API example is built on top of [Fastify](https://fastify.dev/), a powerful api framework that handles hooks and provides numerous plugins, including the following already in use:
- [@fastify/helmet](https://github.com/fastify/fastify-helmet)
- [@fastify/swagger](https://github.com/fastify/fastify-swagger)
- [@fastify/swagger-ui](https://github.com/fastify/fastify-swagger-ui)

The API is fully typed and controlled over [Zod](https://zod.dev/) schemas to improve data validation in such backends or frontends (thanks to the shared package that handle schemas and can be imported by any other apps or packages). 

In addition, the template uses [TS-Rest](https://ts-rest.com/) a fully typed RPC client for REST APIs that comes with plugins to automatically generate OpenAPI schemas and integrate with Fastify:
- [@ts-rest/fastify](https://www.npmjs.com/package/@ts-rest/fastify)
- [@ts-rest/open-api](https://www.npmjs.com/package/@ts-rest/open-api)

> *__Notes:__*
> - *Swagger UI is available at `http(s)://<api_domain>/api/swagger-ui`.*
> - *A function `getApiClient` that returns an apiClient (using fetch, but could be extended to use axios or others) is exported from the `shared package`, it is useful for other apps / packages that needs to consume the API.*

A configuration management system enables type checking and automatic replacement of values in the following order `default variables => configuration file variables => environment variables`.

The environment variables are parsed to extract only the keys with the given prefixes (default parsed prefix set [here](./apps//api/src/utils/config.ts)) to improve security, and the keys are divided by the `__` *(double underscore)* identifier to recreate the configuration object (note that the array must be passed as JSON in the environment variables).

[Prisma](https://www.prisma.io/) is used as an example ORM in the template, providing complete and simplified control of the database based on API code (migrations, simplified queries, etc.). The code base has been split as much as possible to allow easy migration to other ORMs such as [Drizzle](https://orm.drizzle.team/), [Mongoose](https://mongoosejs.com/) or others; to do this, simply replace the `prisma/` folder with the corresponding solution and update the `resources/**/queries.ts` files.

### Shared resources

The `packages` folder can be used to share resources between different applications, and is already used to share `eslint` / `typescript` configurations, a `test-utils` utility package for testing and a `shared` package containing Zod schemas and API contracts. It can also be used to share utility functions, schemas and so on between different applications or packages.

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

Application preview can be enabled using the [Argo-cd PR generator](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Pull-Request), whenever a pull request is tagged with the `preview` label, a preview of the application's current state *(using images tagged  `pr-<pr_number>`)* will be deployed in a Kubernetes cluster. 
To activate this feature, you need to :
- Create a [Github App](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps) to ensure Argo-cd will access to the repository and receive webhooks.
- Deploy an ApplicationSet based on [this template](./ci/preview/applicationset.yaml).
- Create Github Actions environment variables templates. Following the base template you should create 2 variables, one called `API_TEMPLATE_URL` with the value `https://api.pr-<pr_number>.domain.com` and the other called  `DOCS_TEMPLATE_URL` with the value `https://docs.pr-<pr_number>.domain.com`.

### Deployment

An example of a Helm structure is provided in the `./helm` folder to facilitate deployment in a Kubernetes cluster. 
This type of structure makes it easy to add another service with little effort by adding a new service folder in `./helm/templates`, add helpers functions in [_helpers.tpl](./helm/templates/_helpers.tpl) and add a service block in [values.yaml](./helm/values.yaml). Example :
1. *Copy `./helm/templates/api` folder to `./helm/templates/<service_name>`.*
    ```sh
    cp -R ./helm/templates/api ./helm/templates/<service_name>
    ```
2. *Inside the newly created files `./helm/templates/<service_name>/*`, replace all `.Values.api` with `.Values.<service_name>` and `template.api` with `template.<service_name>`.*
    ```sh
    find ./helm/templates/<service_name> -type f -exec perl -pi -e 's|\.Values\.api|\.Values\.<service_name>|g' {} \;
    find ./helm/templates/<service_name> -type f -exec perl -pi -e 's|\.template\.api|\.template\.<service_name>|g' {} \;
    ```
3. *Copy - paste all `template.api.*` functions in `./helm/templates/_helpers.tpl` and rename them to `template.<service_name>`.*
4. *Copy - paste the `api` block in `./helm/values.yaml` and rename it to `<service_name>`.*


Another improvement that should be made is to put the `./helm` directory in a dedicated repository so that it can be used as a Helm registry with version control, see :
- <https://helm.sh/docs/topics/chart_repository#github-pages-example>
- <https://helm.sh/docs/howto/chart_releaser_action>
- <https://github.com/this-is-tobi/helm-charts>

### Github templates

Github templates are already define with a base structure that just need to be updated, see :
- [Issue templates](./.github/ISSUE_TEMPLATE)
- [Pull Request templates](./.github/PULL_REQUEST_TEMPLATE)
- [Security template](./.github/SECURITY.md)
- [Code of Conduct](./.github/CODE_OF_CONDUCT.md)
- [LICENSE](./LICENSE)

## Code structure

### Applications

Structure used for typescript applications :

```sh
./
├── apps
│   ├── api
│   └── docs
├── packages
│   ├── cypress
│   ├── eslint-config
│   ├── shared
│   ├── test-utils
│   └── ts-config
├── bun.lockb
└── package.json
```

### API

Structure used in the API example :

```sh
./apps/api
├── src
│   ├── prisma
│   ├── resources
│   │   ├── system
│   │   │   ├── index.ts
│   │   │   └── router.ts
│   │   └── users
│   │       ├── business.ts
│   │       ├── index.ts
│   │       ├── queries.ts
│   │       └── router.ts
│   ├── utils
│   ├── app.ts
│   ├── database.ts
│   └── server.ts
├── Dockerfile
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

### Helm

Structure used for helm deployment :

```sh
./helm
├── charts
├── templates
│   ├── api
│   │   ├── configmap.yaml
│   │   ├── deployment.yaml
│   │   ├── hpa.yaml
│   │   ├── ingress.yaml
│   │   ├── pullsecret.yml
│   │   ├── secret.yaml
│   │   ├── service.yaml
│   │   └── serviceaccount.yaml
│   ├── docs
│   │   ├── configmap.yaml
│   │   ├── deployment.yaml
│   │   ├── hpa.yaml
│   │   ├── ingress.yaml
│   │   ├── pullsecret.yml
│   │   ├── secret.yaml
│   │   ├── service.yaml
│   │   └── serviceaccount.yaml
│   └── _helpers.tpl
├── Chart.yaml
└── values.yaml
```

## Quickstart

```sh
# Clone this template
bunx degit https://github.com/this-is-tobi/template-monorepo-ts <project_name>

# Go to project directory
cd <project_name>

# Init git on the new project
git init

# Init example files
sh ./ci/scripts/init-env.sh

# Install dependencies
bun install

# Build packages
bun run build
```

## Commands

A bunch of commands are available through [package.json](package.json) scripts.

__Local :__

```sh
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

# Run end to end tests - this requires `bun run dev` to be run in another terminal
bun run test:e2e

# Run end to end tests (CI mode) - this requires `bun run dev` to be run in another terminal
bun run test:e2e-ci
```

__Docker :__

```sh
# Start development mode in docker
bun run docker:dev

# Start production mode in docker
bun run docker:prod

# Run end to end tests in docker
bun run docker:e2e

# Run end to end tests in docker (CI mode)
bun run docker:e2e-ci
```

__Kubernetes :__

```sh
# Setup prerequisite for kubernetes
bun run kube:init

# Start development mode in kubernetes
bun run kube:dev

# Start production mode in kubernetes
bun run kube:prod

# Remove app resources in kubernetes
bun run kube:clean

# Delete kubernetes cluster
bun run kube:delete

# Run end to end tests in kubernetes
bun run kube:e2e

# Run end to end tests in kubernetes (CI mode)
bun run kube:e2e-ci
```

> *__Notes:__ Bun command can be used with filter flag to trigger a script in a given package.json (ex: `bun run --cwd <package_path> <script_name>`).*

## Access

| Application     | URL (local / docker)                 | URL (kubernetes)                       |
| --------------- | ------------------------------------ | -------------------------------------- |
| API             | http://localhost:8081                | http://api.domain.local                |
| API *- swagger* | http://localhost:8081/api/swagger-ui | http://api.domain.local/api/swagger-ui |
| Documentation   | http://localhost:8082                | http://doc.domain.local                |

> *__Notes:__ If the containers are healthy but the services are not resolved with Kubernetes, check that the domains are mapped to `127.0.0.1` in `/etc/hosts`, which is what Bun should do by running the `kube:init` command..*
