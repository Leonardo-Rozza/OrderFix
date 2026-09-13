import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(process.env.ORDENFIX_BACKEND_DIR ?? resolve(frontend, '../mvrg-backend'));
await access(resolve(backend, 'mvnw'));
const run = (args) => new Promise((resolveRun, reject) => {
  const child = spawn('./mvnw', args, { cwd: backend, stdio: 'inherit', env: process.env });
  const onInterrupt = () => child.kill('SIGINT');
  const onTerminate = () => child.kill('SIGTERM');
  process.on('SIGINT', onInterrupt); process.on('SIGTERM', onTerminate);
  const cleanup = () => {
    process.off('SIGINT', onInterrupt); process.off('SIGTERM', onTerminate);
  };
  child.once('error', (error) => { cleanup(); reject(error); });
  child.once('exit', (code, signal) => {
    cleanup();
    if (code === 0) resolveRun();
    else reject(new Error(`El laboratorio de cierre terminó con ${signal ?? `código ${code}`}.`));
  });
});
await run(['-B', '-DskipTests', 'test-compile']);
await run(['-B', '-Dit.test=WorkshopClosureBrowserE2E', `-Dordenfix.browser.frontend=${frontend}`,
  'failsafe:integration-test', 'failsafe:verify']);
