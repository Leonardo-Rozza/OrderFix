import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    }
  )
);

// Selector hook para componentes
export const useAuth = () => {
  const { token, email, isAuthenticated, login, logout } = authStore();
  return { token, email, isAuthenticated, login, logout };
};
