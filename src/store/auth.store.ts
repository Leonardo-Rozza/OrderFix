import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { decodeToken, isTokenExpired, normalizeRole } from '../utils/jwt';
import { queryClient } from '../api/queryClient';

interface AuthState {
  token: string | null;
  email: string | null;
  /** null = desconocido (sesiones viejas); false = mostrar banner de verificación. */
  emailVerificado: boolean | null;
  isAuthenticated: boolean;
  login: (token: string, email: string, emailVerificado?: boolean) => void;
  marcarEmailVerificado: () => void;
  logout: () => void;
}

const sessionIdentity = (token: string | null, email: string | null) => {
  if (!email) return null;
  const claims = decodeToken(token);
  return [
    claims?.tallerId ?? 'sin-taller',
    normalizeRole(claims?.role) ?? 'sin-rol',
    email.trim().toLowerCase(),
  ].join(':');
};

export const authStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      email: null,
      emailVerificado: null,
      isAuthenticated: false,

      login: (token: string, email: string, emailVerificado?: boolean) => {
        const actual = get();
        const identidadActual = sessionIdentity(actual.token, actual.email);
        const identidadNueva = sessionIdentity(token, email);
        if (identidadActual !== identidadNueva) {
          queryClient.clear();
        }
        set({ token, email, emailVerificado: emailVerificado ?? null, isAuthenticated: true });
      },

      marcarEmailVerificado: () => {
        set({ emailVerificado: true });
      },

      logout: () => {
        queryClient.clear();
        set({ token: null, email: null, emailVerificado: null, isAuthenticated: false });
      },
    }),
    {
      name: 'ordenfix-auth',
      // Al cargar: si el token persistido venció, cerrar sesión (evita sesión fantasma).
      onRehydrateStorage: () => (state) => {
        if (state?.token && isTokenExpired(state.token)) {
          state.logout();
        }
      },
    }
  )
);

// Selector hook para componentes
export const useAuth = () => {
  const { token, email, emailVerificado, isAuthenticated, login, marcarEmailVerificado, logout } = authStore();
  // El backend manda "ROLE_ADMIN" / "ROLE_USER"; la UI trabaja con ADMIN / USER.
  const role = normalizeRole(decodeToken(token)?.role);
  const isAdmin = role === 'ADMIN';
  return { token, email, emailVerificado, role, isAdmin, isAuthenticated, login, marcarEmailVerificado, logout };
};
