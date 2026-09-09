import { defineConfig, devices } from '@playwright/test';

const api = new URL(process.env.ORDENFIX_PHOTOS_E2E_API_URL ?? 'http://invalid');
if (api.protocol !== 'http:' || api.hostname !== '127.0.0.1' || !api.port
  || api.username || api.password || api.pathname !== '/' || api.search || api.hash
  || !process.env.ORDENFIX_PHOTOS_E2E_RUN_ID || !process.env.ORDENFIX_PHOTOS_E2E_REPORT
  || !process.env.ORDENFIX_PHOTOS_E2E_ACCOUNTS_JSON) {
  throw new Error('El E2E de fotos requiere el laboratorio efímero: npm run test:e2e:photos-real.');
}

export default defineConfig({
  testDir: './e2e-photos-real', fullyParallel: false, workers: 1, forbidOnly: true,
  retries: 0, timeout: 90_000, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5176', trace: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-320', use: { ...devices['Pixel 5'], viewport: { width: 320, height: 740 } } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5176 --strictPort',
    env: { VITE_REGISTRATION_CONSENT: 'false', VITE_API_BASE_URL: api.origin, VITE_API_URL: '', VITE_SENTRY_DSN: '' },
    url: 'http://127.0.0.1:5176', reuseExistingServer: false, timeout: 60_000,
  },
});
