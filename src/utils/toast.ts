import { toast } from 'react-hot-toast';

export const showSuccess = (message: string) => toast.success(message);
export const showError = (message: string) => toast.error(message);
export const showInfo = (message: string) => toast(message);

export const getErrorMessage = (error: unknown, fallback = 'Ocurrió un error. Inténtalo de nuevo.') => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string; error?: string; detail?: string } } };
    return (
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      axiosError.response?.data?.detail ||
      fallback
    );
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message?: string }).message || fallback;
  }

  return fallback;
};
