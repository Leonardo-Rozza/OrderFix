import { defineConfig, devices } from '@playwright/test';

// Este runner sólo admite el servidor efímero creado por el harness Java.
const api = new URL(process.env.ORDENFIX_REGISTRATION_E2E_API_URL ?? 'http://invalid');
if (api.protocol !== 'http:' || api.hostname !== '127.0.0.1' || !api.port
  || api.username || api.password || api.pathname !== '/' || api.search || api.hash) {
  throw new Error('El E2E real requiere la URL loopback del harness; ejecutá npm run test:e2e:registration-real.');
}
if (!process.env.ORDENFIX_REGISTRATION_E2E_RUN_ID || !process.env.ORDENFIX_REGISTRATION_E2E_REPORT) {
  throw new Error('Falta la identidad o el reporte del laboratorio efímero.');
}

export default defineConfig({
  testDir: './e2e-registration-real',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  timeout: 60_000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5175', trace: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-320', use: { ...devices['Pixel 5'], viewport: { width: 320, height: 740 } } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort',
    env: {
      VITE_REGISTRATION_CONSENT: 'true', VITE_API_BASE_URL: api.origin, VITE_API_URL: '', VITE_SENTRY_DSN: '',
      VITE_LEGAL_EMAIL: '', VITE_PRIVACY_EMAIL: '', VITE_SUPPORT_EMAIL: '',
    },
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
