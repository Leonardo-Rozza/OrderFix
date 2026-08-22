import { defineConfig, devices } from '@playwright/test';

// E2E con la app real (Vite) y la API mockeada a nivel de red (page.route).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-320',
      testMatch: /mobile\.spec\.ts/,
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 320, height: 568 },
      },
    },
    {
      name: 'mobile-390',
      testMatch: /mobile\.spec\.ts/,
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'mobile-landscape',
      testMatch: /mobile\.spec\.ts/,
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 844, height: 390 },
      },
    },
    {
      name: 'mobile-webkit',
      testMatch: /mobile\.spec\.ts/,
      // WebKit es sensiblemente más pesado: serializar este único spec evita
      // timeouts falsos cuando corre junto a toda la matriz de navegadores.
      fullyParallel: false,
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
