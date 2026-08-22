import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { AxiosError } from 'axios';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App.tsx';
import { ThemeBootstrapper } from './components/ThemeBootstrapper.tsx';
import { AppCrash } from './components/AppCrash.tsx';
import { initSentry } from './lib/sentry.ts';
import { queryClient } from './api/queryClient.ts';

// Monitoreo de errores (no-op si no hay VITE_SENTRY_DSN).
initSentry();

// Los errores HTTP ya tienen su manejo (toast del interceptor/mutaciones y
// reporte a Sentry): si un `await mutateAsync()` de un form queda sin catch,
// evitamos el "unhandled rejection" en consola — el modal queda abierto y el
// toast ya avisó, que es el comportamiento buscado.
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason instanceof AxiosError) event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeBootstrapper />
      <Sentry.ErrorBoundary fallback={<AppCrash />}>
        <App />
      </Sentry.ErrorBoundary>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      {import.meta.env.DEV ? (
        <div className="hidden lg:block">
          <ReactQueryDevtools initialIsOpen={false} />
        </div>
      ) : null}
    </QueryClientProvider>
  </StrictMode>
);
