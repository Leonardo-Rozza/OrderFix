import { defineConfig, devices } from '@playwright/test';
import { isAbsolute } from 'node:path';

const api = new URL(process.env.ORDENFIX_EXPORT_E2E_API_URL ?? 'http://invalid');
if (api.protocol !== 'http:' || api.hostname !== '127.0.0.1' || !api.port
  || api.username || api.password || api.pathname !== '/' || api.search || api.hash
  || !/^[0-9a-f-]{36}$/.test(process.env.ORDENFIX_EXPORT_E2E_RUN_ID ?? '')
  || !isAbsolute(process.env.ORDENFIX_EXPORT_E2E_REPORT ?? '')
  || !process.env.ORDENFIX_EXPORT_E2E_ACCOUNTS_JSON) {
  throw new Error('El E2E de exportación requiere el laboratorio efímero: npm run test:e2e:export-real.');
}

export default defineConfig({
  testDir: './e2e-export-real', fullyParallel: false, workers: 1, forbidOnly: true,
  retries: 0, timeout: 90_000, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5177', trace: 'off', screenshot: 'off', video: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-320', use: { ...devices['Pixel 5'], viewport: { width: 320, height: 740 } } },
  ],
  webServer: {
    command: 'npm run dev -- --config vite.export-real.config.ts --host 127.0.0.1 --port 5177 --strictPort',
    env: { VITE_REGISTRATION_CONSENT: 'false', VITE_API_BASE_URL: api.origin, VITE_API_URL: '', VITE_SENTRY_DSN: '' },
    url: 'http://127.0.0.1:5177', reuseExistingServer: false, timeout: 60_000,
  },
});
