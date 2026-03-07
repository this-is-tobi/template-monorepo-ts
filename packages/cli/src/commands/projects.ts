import type { CommandDef } from 'citty'
import type { GlobalArgs } from '../types.js'
import { defineCommand } from 'citty'
import { globalArgs } from '../args.js'
import { createClient } from '../client.js'
import { resolveConfig } from '../config.js'
import { printOutput } from '../formatter.js'

interface CreateArgs extends GlobalArgs {
  name: string
  description?: string
}

interface GetArgs extends GlobalArgs {
  id: string
}

interface UpdateArgs extends GlobalArgs {
  id: string
  name?: string
  description?: string
}

interface DeleteArgs extends GlobalArgs {
  id: string
}

/**
 * Run the `projects list` command.
 */
export async function runList(args: GlobalArgs): Promise<void> {
  const config = await resolveConfig(args)
  const client = createClient(config)
  const { data } = await client.projects.getAll()
  printOutput(data, config.output)
}

/**
 * Run the `projects get` command.
 */
export async function runGet(args: GetArgs): Promise<void> {
  const config = await resolveConfig(args)
  const client = createClient(config)
  const { data } = await client.projects.getById(args.id)
  printOutput(data, config.output)
}

/**
 * Run the `projects create` command.
 */
export async function runCreate(args: CreateArgs): Promise<void> {
  const config = await resolveConfig(args)
  const client = createClient(config)
  const { data } = await client.projects.create({
    name: args.name,
    ...(args.description ? { description: args.description } : {}),
  })
  printOutput(data, config.output)
}

/**
 * Run the `projects update` command.
 */
export async function runUpdate(args: UpdateArgs): Promise<void> {
  const config = await resolveConfig(args)
  const client = createClient(config)
  const body: Record<string, string> = {}
  if (args.name) body.name = args.name
  if (args.description) body.description = args.description
  const { data } = await client.projects.update(args.id, body as { name: string, description: string })
  printOutput(data, config.output)
}

/**
 * Run the `projects delete` command.
 */
export async function runDelete(args: DeleteArgs): Promise<void> {
  const config = await resolveConfig(args)
  const client = createClient(config)
  await client.projects.delete(args.id)
  printOutput({ message: `Project ${args.id} deleted.` }, config.output)
}

const projectsCommand: CommandDef = defineCommand({
  meta: {
    name: 'projects',
    description: 'Manage projects',
  },
  subCommands: {
    list: defineCommand({
      meta: { description: 'List all projects' },
      args: { ...globalArgs },
      run: ({ args }) => runList(args as unknown as GlobalArgs),
    }),
    get: defineCommand({
      meta: { description: 'Get a project by ID' },
      args: {
        ...globalArgs,
        id: { type: 'positional', description: 'Project ID', required: true },
      },
      run: ({ args }) => runGet(args as unknown as GetArgs),
    }),
    create: defineCommand({
      meta: { description: 'Create a new project' },
      args: {
        ...globalArgs,
        name: { type: 'string', description: 'Project name', required: true },
        description: { type: 'string', description: 'Project description' },
      },
      run: ({ args }) => runCreate(args as unknown as CreateArgs),
    }),
    update: defineCommand({
      meta: { description: 'Update a project' },
      args: {
        ...globalArgs,
        id: { type: 'positional', description: 'Project ID', required: true },
        name: { type: 'string', description: 'New project name' },
        description: { type: 'string', description: 'New project description' },
      },
      run: ({ args }) => runUpdate(args as unknown as UpdateArgs),
    }),
    delete: defineCommand({
      meta: { description: 'Delete a project' },
      args: {
        ...globalArgs,
        id: { type: 'positional', description: 'Project ID', required: true },
      },
      run: ({ args }) => runDelete(args as unknown as DeleteArgs),
    }),
  },
})

export default projectsCommand
