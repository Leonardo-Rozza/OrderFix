import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { decodeToken, isTokenExpired } from '../utils/jwt';

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

export const authStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      emailVerificado: null,
      isAuthenticated: false,

      login: (token: string, email: string, emailVerificado?: boolean) => {
        set({ token, email, emailVerificado: emailVerificado ?? null, isAuthenticated: true });
      },

      marcarEmailVerificado: () => {
        set({ emailVerificado: true });
      },

      logout: () => {
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
  const role = decodeToken(token)?.role ?? null;
  // El backend manda roles tipo "ROLE_ADMIN" / "ROLE_USER".
  const isAdmin = !!role && role.toUpperCase().includes('ADMIN');
  return { token, email, emailVerificado, role, isAdmin, isAuthenticated, login, marcarEmailVerificado, logout };
};
