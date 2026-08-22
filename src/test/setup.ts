import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './server';

// JSDOM y la Request nativa de Node usan implementaciones distintas de
// AbortSignal. React Router crea Requests al navegar y Undici rechaza una
// señal de otro realm. El adaptador conserva las señales compatibles y omite
// únicamente la señal cross-realm en este entorno de tests.
const NativeRequest = globalThis.Request;
const acceptsRequestSignal = (signal: AbortSignal) => {
  try {
    new NativeRequest('http://localhost', { signal });
    return true;
  } catch {
    return false;
  }
};

class JSDOMCompatibleRequest extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    const compatibleInit = init?.signal && !acceptsRequestSignal(init.signal)
      ? { ...init, signal: undefined }
      : init;
    super(input, compatibleInit);
  }
}

globalThis.Request = JSDOMCompatibleRequest;

// MSW: levanta el server mock una vez; resetea handlers entre tests.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());
