import { QueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';

/**
 * Única caché de servidor de la aplicación.
 *
 * Se exporta para que la frontera de autenticación pueda vaciar todos los datos
 * tenant-scoped antes de cambiar de identidad o cerrar la sesión.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      // No reintentar errores 4xx (auth/permiso/no encontrado); sí red/5xx.
      retry: (failureCount, error) => {
        const status = error instanceof AxiosError ? error.response?.status : undefined;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});
