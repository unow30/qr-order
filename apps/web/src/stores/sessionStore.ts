import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  sessionToken: string | null;
  tableId: string | null;
  tableNumber: number | null;
  tableName: string | null;
  storeId: string | null;
  storeName: string | null;
  expiresAt: string | null;
  pin: string | null;
  setSession: (data: {
    sessionToken: string;
    tableId: string;
    tableNumber: number;
    tableName: string;
    storeId?: string;
    storeName?: string;
    expiresAt: string;
    pin?: string;
  }) => void;
  clearSession: () => void;
  isSessionValid: () => boolean;
  /** 서버 renewSession과 동기화 — TTL(초) 만큼 expiresAt 연장 */
  renewExpiry: (ttlSeconds?: number) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessionToken: null,
      tableId: null,
      tableNumber: null,
      tableName: null,
      storeId: null,
      storeName: null,
      expiresAt: null,
      pin: null,
      setSession: (data) =>
        set({
          ...data,
          storeId: data.storeId ?? null,
          storeName: data.storeName ?? null,
          pin: data.pin ?? null,
        }),
      clearSession: () =>
        set({
          sessionToken: null,
          tableId: null,
          tableNumber: null,
          tableName: null,
          storeId: null,
          storeName: null,
          expiresAt: null,
          pin: null,
        }),
      isSessionValid: () => {
        const { expiresAt } = get();
        if (!expiresAt) return false;
        return new Date(expiresAt) > new Date();
      },
      renewExpiry: (ttlSeconds = 7200) => {
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
        set({ expiresAt });
      },
    }),
    { name: 'qr-order-session' },
  ),
);
