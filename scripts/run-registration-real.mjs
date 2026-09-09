import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(process.env.ORDENFIX_BACKEND_DIR ?? resolve(frontend, '../mvrg-backend'));
await access(resolve(backend, 'mvnw'));
await access(resolve(backend, 'src/test/java/com/leonardorozza/mvgrreparacionesbackend/legal/manifest/persistence/LegalRegistrationBrowserE2E.java'));

// Maven es secuencial: compila la fuente actual y luego ejecuta sólo el harness opt-in.
const run = (args) => new Promise((resolveRun, reject) => {
  const child = spawn('./mvnw', args, { cwd: backend, stdio: 'inherit', env: process.env });
  const interrupt = (signal) => child.kill(signal);
  const onInterrupt = () => interrupt('SIGINT');
  const onTerminate = () => interrupt('SIGTERM');
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onTerminate);
  const cleanup = () => {
    process.off('SIGINT', onInterrupt);
    process.off('SIGTERM', onTerminate);
  };
  child.once('error', (error) => { cleanup(); reject(error); });
  child.once('exit', (code, signal) => {
    cleanup();
    if (code === 0) resolveRun();
    else reject(new Error(`El harness terminó con ${signal ?? `código ${code}`}.`));
  });
});

await run(['-B', '-DskipTests', 'test-compile']);
await run(['-B', '-Dit.test=LegalRegistrationBrowserE2E', `-Dordenfix.browser.frontend=${frontend}`,
  'failsafe:integration-test', 'failsafe:verify']);
