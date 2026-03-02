import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { AppModule } from './types.js'
import { config } from '~/utils/config.js'

// ---------------------------------------------------------------------------
// Module registry — populated by `setupModules`, consumed by `server.ts`
// ---------------------------------------------------------------------------

let registeredModules: readonly AppModule[] = []

/**
 * Returns the list of modules that were registered during Fastify's plugin phase.
 * Called by `server.ts` to drive `onReady` / `onClose` lifecycle hooks.
 */
export function getRegisteredModules(): readonly AppModule[] {
  return registeredModules
}

// ---------------------------------------------------------------------------
// Module loader
// ---------------------------------------------------------------------------

/**
 * Load, register and decorate Fastify for every **enabled** module.
 *
 * Must be called inside a `app.register(async (instance) => { … })` scope
 * so that decorators are visible to all routes registered in the same scope.
 *
 * When a module is **disabled** its decorators are replaced with no-ops so
 * route code can reference `app.requireAuth` / `app.requireRole` without
 * conditional imports.
 */
export async function setupModules(app: FastifyInstance): Promise<void> {
  const modules: AppModule[] = []

  // ── Auth module (toggle: config.modules.auth) ──────────────────────────
  if (config.modules.auth) {
    const { default: authModule } = await import('./auth/index.js')
    modules.push(authModule)
  } else {
    // No-op decorators — routes compile & run but skip auth entirely
    app.decorate('requireAuth', async (_req: FastifyRequest, _reply: FastifyReply) => {})
    app.decorate('requireRole', (..._roles: string[]) => {
      return async (_req: FastifyRequest, _reply: FastifyReply) => {}
    })
    app.log.info('Auth module disabled — using no-op middleware')
  }

  // ── Audit module (toggle: config.modules.audit) ────────────────────────
  if (config.modules.audit) {
    const { default: auditModule } = await import('./audit/index.js')
    modules.push(auditModule)
  }

  // ── Register all enabled modules ───────────────────────────────────────
  for (const mod of modules) {
    await mod.register(app)
    app.log.info(`Module "${mod.name}" registered`)
  }

  registeredModules = Object.freeze([...modules])
}
