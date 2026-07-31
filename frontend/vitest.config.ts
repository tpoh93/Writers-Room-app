import { resolve } from 'path'

import vue from '@vitejs/plugin-vue'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      '@': resolve(__dirname, 'src/renderer/src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/renderer/src/test/setup.ts'],
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    exclude: [...configDefaults.exclude, 'scripts/__tests__/**/*.test.cjs'],
  },
})
