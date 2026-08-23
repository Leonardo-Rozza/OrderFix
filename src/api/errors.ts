import axios from 'axios';
import type { ApiErrorBody } from '../types';

/** Extrae el contrato de error sin acoplar formularios a la forma interna de Axios. */
export const getApiErrorBody = (error: unknown): ApiErrorBody | undefined => {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return undefined;
  return error.response?.data;
};

export const hasApiErrorCode = (error: unknown, code: string) =>
  getApiErrorBody(error)?.code === code;
