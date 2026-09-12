import { defineConfig } from 'vite';
import base from './vite.config';

// Laboratorio opt-in: el servidor efímero sólo recibe las variables explícitas de Playwright.
export default defineConfig({ ...base, envDir: false });
