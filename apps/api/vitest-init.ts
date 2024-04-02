import { vi } from 'vitest'

vi.mock('@/prisma/clients.js')

// Disable deprecation warning because of prisma fetch engine warning occuring only during tests
//
// DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
//     at node:punycode:3:9
//     at BuiltinModule.compileForInternalLoader (node:internal/bootstrap/realm:398:7)
//     at BuiltinModule.compileForPublicLoader (node:internal/bootstrap/realm:337:10)
//     at loadBuiltinModule (node:internal/modules/helpers:104:7)
//     at Function._load (node:internal/modules/cjs/loader:999:17)
//     at Module.require (node:internal/modules/cjs/loader:1230:19)
//     at require (node:internal/modules/helpers:179:18)
//     at ../../node_modules/.pnpm/whatwg-url@5.0.0/node_modules/whatwg-url/lib/url-state-machine.js (/Users/tobi/Dev/perso/template-monorepo-ts/node_modules/@prisma/fetch-engine/dist/chunk-QOFRMARP.js:518:56)
//     at __require2 (/Users/tobi/Dev/perso/template-monorepo-ts/node_modules/@prisma/fetch-engine/dist/chunk-VBXJIVYU.js:40:51)
//     at ../../node_modules/.pnpm/whatwg-url@5.0.0/node_modules/whatwg-url/lib/URL-impl.js (/Users/tobi/Dev/perso/template-monorepo-ts/node_modules/@prisma/fetch-engine/dist/chunk-QOFRMARP.js:1588:15)
process.removeAllListeners('warning')
