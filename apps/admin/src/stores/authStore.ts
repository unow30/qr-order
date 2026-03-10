import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  username: string | null;
  setAuth: (accessToken: string, username: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      username: null,
      setAuth: (accessToken, username) => set({ accessToken, username }),
      clearAuth: () => set({ accessToken: null, username: null }),
      isAuthenticated: () => !!get().accessToken,
    }),
    { name: 'qr-order-admin-auth' },
  ),
);
