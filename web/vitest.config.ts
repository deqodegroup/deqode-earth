import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['{lib,app,components}/**/*.test.ts'],
  },
})
