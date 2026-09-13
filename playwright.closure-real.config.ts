import { defineConfig, devices } from '@playwright/test';
import { isAbsolute } from 'node:path';

const api = new URL(process.env.ORDENFIX_CLOSURE_E2E_API_URL ?? 'http://invalid');
if (api.protocol !== 'http:' || api.hostname !== '127.0.0.1' || !api.port
  || api.username || api.password || api.pathname !== '/' || api.search || api.hash
  || !/^[0-9a-f-]{36}$/.test(process.env.ORDENFIX_CLOSURE_E2E_RUN_ID ?? '')
  || !isAbsolute(process.env.ORDENFIX_CLOSURE_E2E_REPORT ?? '')
  || !process.env.ORDENFIX_CLOSURE_E2E_ACCOUNTS_JSON) {
  throw new Error('El E2E de cierre requiere el laboratorio efímero: npm run test:e2e:closure-real.');
}

export default defineConfig({
  testDir: './e2e-closure-real', fullyParallel: false, workers: 1, forbidOnly: true,
  retries: 0, timeout: 120_000, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5178', trace: 'off', screenshot: 'off', video: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-320', use: { ...devices['Pixel 5'], viewport: { width: 320, height: 740 } } },
  ],
  webServer: {
    command: 'npm run dev -- --config vite.closure-real.config.ts --host 127.0.0.1 --port 5178 --strictPort',
    env: { VITE_WORKSHOP_CLOSURE_ENABLED: 'true', VITE_REGISTRATION_CONSENT: 'false', VITE_API_BASE_URL: api.origin, VITE_API_URL: '', VITE_SENTRY_DSN: '' },
    url: 'http://127.0.0.1:5178', reuseExistingServer: false, timeout: 60_000,
  },
});
