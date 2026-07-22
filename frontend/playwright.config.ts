import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: [
    {
      command: 'node tests/e2e/mock-supabase-server.js',
      port: 54321,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev -- -p 3000',
      port: 3000,
      reuseExistingServer: true,
      timeout: 120000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'eyJmYWtlIjoiZmFrZSJ9.fake',
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
