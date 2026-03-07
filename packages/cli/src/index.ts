#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'
import authCommand from './commands/auth.js'
import configCommand from './commands/config.js'
import projectsCommand from './commands/projects.js'
import systemCommand from './commands/system.js'

const main = defineCommand({
  meta: {
    name: 'tmts',
    version: '1.0.0',
    description: 'CLI for template-monorepo-ts API',
  },
  subCommands: {
    system: systemCommand,
    projects: projectsCommand,
    auth: authCommand,
    config: configCommand,
  },
})

runMain(main)
