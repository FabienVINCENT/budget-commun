import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// base './' : l'app marche aussi bien à la racine que sous /budget-commun/ (GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [vue()],
  build: { target: 'es2022', sourcemap: false },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
