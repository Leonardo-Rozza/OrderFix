import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { decodeToken, isTokenExpired } from '../utils/jwt';

interface AuthState {
  token: string | null;
  email: string | null;
  isAuthenticated: boolean;
  login: (token: string, email: string) => void;
  logout: () => void;
}

export const authStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      isAuthenticated: false,

      login: (token: string, email: string) => {
        set({ token, email, isAuthenticated: true });
      },

      logout: () => {
        set({ token: null, email: null, isAuthenticated: false });
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
  const { token, email, isAuthenticated, login, logout } = authStore();
  const role = decodeToken(token)?.role ?? null;
  // El backend manda roles tipo "ROLE_ADMIN" / "ROLE_USER".
  const isAdmin = !!role && role.toUpperCase().includes('ADMIN');
  return { token, email, role, isAdmin, isAuthenticated, login, logout };
};
