import { defineConfig, devices } from '@playwright/test';

// Servidor aislado para acreditar el rollout activado sin cambiar el flujo legacy de otros E2E.
export default defineConfig({
  testDir: './e2e-registration',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5174', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-320', use: { ...devices['Pixel 5'], viewport: { width: 320, height: 740 } } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
    env: { VITE_REGISTRATION_CONSENT: 'true', VITE_API_BASE_URL: 'http://localhost:8080', VITE_API_URL: '' },
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
