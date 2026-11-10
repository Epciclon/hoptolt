import { defineConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['html', { open: 'never' }], ['github'], ['list']] : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1440, height: 900 },
  },
  webServer: [
    {
      command: 'node tests/e2e/mock-supabase-server.js',
      port: 54321,
      reuseExistingServer: !isCI,
    },
    {
      command: isCI ? 'npm run start -- -p 3000' : 'npm run dev -- -p 3000',
      port: 3000,
      reuseExistingServer: !isCI,
      timeout: 120000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'eyJmYWtlIjoiZmFrZSJ9.fake',
        E2E_BYPASS_ENABLED: 'true',
        NEXT_PUBLIC_E2E_BYPASS: 'true',
      },
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
