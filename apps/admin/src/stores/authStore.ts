import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AdminRole = 'SUPER_ADMIN' | 'STORE_ADMIN';

interface AuthState {
  accessToken: string | null;
  username: string | null;
  role: AdminRole | null;
  /** 로그인한 어드민의 고유 storeId (STORE_ADMIN이면 본인 매장, SUPER_ADMIN이면 null) */
  storeId: string | null;
  /** 현재 선택된 매장 ID (SUPER_ADMIN은 전환 가능, STORE_ADMIN은 storeId와 동일) */
  currentStoreId: string | null;
  setAuth: (token: string, username: string, role: AdminRole, storeId: string | null) => void;
  setCurrentStoreId: (storeId: string | null) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      username: null,
      role: null,
      storeId: null,
      currentStoreId: null,
      setAuth: (accessToken, username, role, storeId) =>
        set({
          accessToken,
          username,
          role,
          storeId,
          // STORE_ADMIN은 본인 매장이 currentStoreId, SUPER_ADMIN은 미선택 상태로 시작
          currentStoreId: role === 'STORE_ADMIN' ? storeId : null,
        }),
      setCurrentStoreId: (storeId) => set({ currentStoreId: storeId }),
      clearAuth: () =>
        set({ accessToken: null, username: null, role: null, storeId: null, currentStoreId: null }),
      isAuthenticated: () => !!get().accessToken,
      isSuperAdmin: () => get().role === 'SUPER_ADMIN',
    }),
    { name: 'qr-order-admin-auth' },
  ),
);
