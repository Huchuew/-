import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:5200',
    headless: true,
  },
  webServer: {
    command: 'npm run dev -- --port 5200',
    url: 'http://localhost:5200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
