import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Configured with the GitHub Pages repository path so built asset URLs are
// rooted at /fr/.
export default defineConfig({
  base: '/fr/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
})
