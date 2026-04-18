import type { CommandDef } from 'citty'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { defineCommand } from 'citty'

interface ResourceArgs {
  name: string
  dir: string
  force: boolean | string
}

/**
 * Capitalise the first letter of a string.
 * `'foo'` → `'Foo'`, `'fooBar'` → `'FooBar'`.
 */
function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1)
}

/**
 * Validate a resource name. Rejects anything that would not produce a
 * valid TypeScript identifier when capitalised (`Foo`, `MyThing`, …).
 */
function validateName(name: string): void {
  if (!/^[a-z][a-z0-9-]*$/.test(name))
    throw new Error(`Invalid resource name "${name}". Use lowercase letters, digits and dashes (e.g. "foo", "foo-bar").`)
}

/**
 * Convert a kebab-case resource name into a camelCase identifier suitable
 * for TypeScript variables (`'foo-bar'` → `'fooBar'`).
 */
function toCamel(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

/**
 * Build the file templates for a new resource. Returned as a map of
 * `relativePath → content` so the writer stays I/O-free and easy to test.
 */
export function buildResourceFiles(name: string): Record<string, string> {
  validateName(name)
  const camel = toCamel(name)
  const Pascal = capitalize(camel)

  const indexTs = `export * from './queries.js'\nexport * from './router.js'\n`

  const constantsTs = `/**\n * Centralised response messages for the ${camel} resource.\n */\nexport const ${camel}Messages = {\n  retrieved: '${camel} successfully retrieved',\n  notFound: '${camel} not found',\n} as const\n`

  const queriesTs = `import { db } from '~/prisma/clients.js'\n\n// TODO: replace with real Prisma calls for the ${camel} resource.\nvoid db\n`

  const businessTs = `import type { FastifyRequest } from 'fastify'\n\n// TODO: implement orchestration for the ${camel} resource.\n// Throw \`new APIError(N, 'CODE', '...')\` for invariant violations.\n// Routers handle 4xx replies inline; business throws.\nexport async function noop(_req: FastifyRequest): Promise<void> {}\n`

  const routerTs = `import type { FastifyInstance } from 'fastify'\nimport { createProtection } from '~/utils/index.js'\n\n/** Creates the ${camel} router plugin for Fastify. */\nexport function get${Pascal}Router() {\n  return async (app: FastifyInstance) => {\n    // Use \`createProtection(app)\` to build preHandler chains:\n    //   protect.auth(route)        \u2014 auth + Zod validation\n    //   protect.admin(route)       \u2014 + admin role\n    //   protect.permission(route, opts, [extra]) \u2014 + permission check\n    void createProtection(app)\n  }\n}\n`

  return {
    'index.ts': indexTs,
    'constants.ts': constantsTs,
    'queries.ts': queriesTs,
    'business.ts': businessTs,
    'router.ts': routerTs,
  }
}

/**
 * Write a generated resource to disk under `<dir>/<name>/`. Refuses to
 * overwrite an existing non-empty directory unless `force` is true.
 */
export async function writeResource(name: string, dir: string, force: boolean): Promise<string> {
  const target = resolve(dir, name)
  await mkdir(target, { recursive: true })
  const existing = await readdir(target).catch(() => [] as string[])
  if (existing.length > 0 && !force)
    throw new Error(`Target directory "${target}" is not empty. Re-run with --force to overwrite.`)

  const files = buildResourceFiles(name)
  for (const [filename, content] of Object.entries(files))
    await writeFile(join(target, filename), content, 'utf8')

  return target
}

/**
 * Run the `generate resource` command.
 */
export async function runGenerateResource(args: ResourceArgs): Promise<void> {
  const force = args.force === true || args.force === 'true'
  const target = await writeResource(args.name, args.dir, force)
  console.log(`Created resource "${args.name}" at ${target}`)
  console.log('Next steps:\n  1. Wire `index.ts` into apps/api/src/server.ts (register router)\n  2. Add a Prisma model for the resource and run `bunx prisma generate`\n  3. Define route schemas in packages/shared/src/routes/<name>.ts\n  4. Write co-located *.spec.ts tests')
}

const generateCommand: CommandDef = defineCommand({
  meta: {
    name: 'generate',
    description: 'Code generators (resources, modules, ...)',
  },
  subCommands: {
    resource: defineCommand({
      meta: { description: 'Scaffold a new API resource (router + business + queries + constants).' },
      args: {
        name: {
          type: 'positional',
          description: 'Resource name in kebab-case (e.g. "tickets", "audit-export")',
          required: true,
        },
        dir: {
          type: 'string',
          description: 'Target directory (default: apps/api/src/resources)',
          default: 'apps/api/src/resources',
        },
        force: {
          type: 'boolean',
          description: 'Overwrite existing files in the target directory',
          default: false,
        },
      },
      run: ({ args }) => runGenerateResource(args as unknown as ResourceArgs),
    }),
  },
})

export default generateCommand
