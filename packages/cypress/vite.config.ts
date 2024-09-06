import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { env } from './src/env.js'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: Number(env.defaultPort),
  },
  define: {
    'process.env': process.env,
  },
  plugins: [],
  base: process.env.BASE_URL || '/',
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: [],
  },
  build: {
    target: 'esnext',
  },
})
