import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(process.env.ORDENFIX_BACKEND_DIR ?? resolve(frontend, '../mvrg-backend'));
const cloudinary = process.env.ORDENFIX_PHOTOS_BROWSER_CLOUDINARY;
if (cloudinary !== undefined && cloudinary !== 'synthetic-only') {
  throw new Error('Cloudinary requiere ORDENFIX_PHOTOS_BROWSER_CLOUDINARY=synthetic-only.');
}
if (cloudinary && !process.env.ORDENFIX_CLOUDINARY_CREDENTIALS_FILE?.trim()) {
  throw new Error('Indicá ORDENFIX_CLOUDINARY_CREDENTIALS_FILE sin copiar sus valores al frontend.');
}
console.info(cloudinary
  ? 'Fotos: PostgreSQL temporal y Cloudinary real; hasta cuatro imágenes sintéticas con limpieza propia.'
  : 'Fotos: PostgreSQL temporal y almacenamiento local de prueba.');
await access(resolve(backend, 'mvnw'));
await access(resolve(backend, 'src/test/java/com/leonardorozza/mvgrreparacionesbackend/legal/manifest/persistence/PrivatePhotoBrowserE2E.java'));
const run = (args) => new Promise((resolveRun, reject) => {
  const child = spawn('./mvnw', args, { cwd: backend, stdio: 'inherit', env: process.env });
  const onInterrupt = () => child.kill('SIGINT');
  const onTerminate = () => child.kill('SIGTERM');
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
    else reject(new Error(`El laboratorio de fotos terminó con ${signal ?? `código ${code}`}.`));
  });
});
await run(['-B', '-DskipTests', 'test-compile']);
await run(['-B', '-Dit.test=PrivatePhotoBrowserE2E', `-Dordenfix.browser.frontend=${frontend}`,
  'failsafe:integration-test', 'failsafe:verify']);
