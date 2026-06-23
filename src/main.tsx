import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { AxiosError } from 'axios';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App.tsx';
import { ThemeBootstrapper } from './components/ThemeBootstrapper.tsx';
import { AppCrash } from './components/AppCrash.tsx';
import { initSentry } from './lib/sentry.ts';

// Monitoreo de errores (no-op si no hay VITE_SENTRY_DSN).
initSentry();

// Configuración de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos
      // No reintentar errores 4xx (auth/permiso/no encontrado); sí los de red/5xx.
      retry: (failureCount, error) => {
        const status = error instanceof AxiosError ? error.response?.status : undefined;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeBootstrapper />
      <Sentry.ErrorBoundary fallback={<AppCrash />}>
        <App />
      </Sentry.ErrorBoundary>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
