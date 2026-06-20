import { setupServer } from 'msw/node';

/** Servidor MSW para tests. Cada test agrega sus handlers con server.use(...). */
export const server = setupServer();

/** Base URL que usa axios en tests (sin VITE_API_*, cae al default + /api). */
export const API = 'http://localhost:8080/api';
