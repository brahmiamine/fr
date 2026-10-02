import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Served from the root of https://fr.testcivique.workers.dev/ (Cloudflare
// Workers static assets), so built asset URLs are rooted at /.
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Content JSON and React change at different rhythms than the UI:
        // separate chunks keep them cached across releases.
        manualChunks(id) {
          if (id.includes('/src/data/')) return 'content'
          if (id.includes('node_modules')) return 'vendor'
          return undefined
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
})
