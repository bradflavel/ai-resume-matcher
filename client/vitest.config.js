// vitest config for the client
// jsdom env so react components can render, setup file loads jest-dom matchers
// coverage thresholds get added in step 7 once we see what coverage actually looks like

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      // the entry file and css don't need coverage, neither does the test folder itself
      exclude: ['src/main.jsx', 'src/test/**', '**/*.test.{js,jsx}'],
      // set ~5% below what we measured so CI stays strict without flaking
      thresholds: {
        statements: 90,
        branches: 80,
        functions: 85,
        lines: 90,
      },
    },
  },
});
