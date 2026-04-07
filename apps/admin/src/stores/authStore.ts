import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AdminRole = 'SUPER_ADMIN' | 'STORE_ADMIN' | 'SUPER_ADMIN_READONLY';

interface AuthState {
  accessToken: string | null;
  username: string | null;
  role: AdminRole | null;
  /** 로그인한 어드민의 담당 매장 ID 목록 (STORE_ADMIN이면 1개 이상, SUPER_ADMIN이면 빈 배열) */
  storeIds: string[];
  /** 현재 선택된 매장 ID (SUPER_ADMIN/다중 담당 STORE_ADMIN은 전환 가능, 단일 담당 STORE_ADMIN은 자동 설정) */
  currentStoreId: string | null;
  setAuth: (token: string, username: string, role: AdminRole, storeIds: string[]) => void;
  setCurrentStoreId: (storeId: string | null) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  isSuperAdmin: () => boolean;
  isSuperAdminReadOnly: () => boolean;
  hasSuperAdminAccess: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      username: null,
      role: null,
      storeIds: [],
      currentStoreId: null,
      setAuth: (accessToken, username, role, storeIds) =>
        set({
          accessToken,
          username,
          role,
          storeIds,
          // 단일 담당 STORE_ADMIN은 자동 선택, 다중 담당/SUPER_ADMIN은 미선택 상태로 시작
          currentStoreId: role === 'STORE_ADMIN' && storeIds.length === 1 ? storeIds[0] : null,
        }),
      setCurrentStoreId: (storeId) => set({ currentStoreId: storeId }),
      clearAuth: () =>
        set({ accessToken: null, username: null, role: null, storeIds: [], currentStoreId: null }),
      isAuthenticated: () => !!get().accessToken,
      isSuperAdmin: () => get().role === 'SUPER_ADMIN',
      isSuperAdminReadOnly: () => get().role === 'SUPER_ADMIN_READONLY',
      hasSuperAdminAccess: () => {
        const r = get().role;
        return r === 'SUPER_ADMIN' || r === 'SUPER_ADMIN_READONLY';
      },
    }),
    { name: 'qr-order-admin-auth' },
  ),
);
