import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  sessionToken: string | null;
  tableId: string | null;
  tableNumber: number | null;
  tableName: string | null;
  expiresAt: string | null;
  setSession: (data: {
    sessionToken: string;
    tableId: string;
    tableNumber: number;
    tableName: string;
    expiresAt: string;
  }) => void;
  clearSession: () => void;
  isSessionValid: () => boolean;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessionToken: null,
      tableId: null,
      tableNumber: null,
      tableName: null,
      expiresAt: null,
      setSession: (data) => set(data),
      clearSession: () =>
        set({
          sessionToken: null,
          tableId: null,
          tableNumber: null,
          tableName: null,
          expiresAt: null,
        }),
      isSessionValid: () => {
        const { expiresAt } = get();
        if (!expiresAt) return false;
        return new Date(expiresAt) > new Date();
      },
    }),
    { name: 'qr-order-session' },
  ),
);
