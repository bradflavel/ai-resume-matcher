// vitest config for the server
// node env because we're testing an express app, no DOM needed
// thresholds are added later in step 7 once we see what coverage actually looks like

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.js'],
    // setup runs before each test file, sets NODE_ENV and fake api keys
    // so index.js sees them when it loads
    setupFiles: ['./test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['index.js'],
      exclude: ['test/**', 'node_modules/**'],
    },
  },
});
