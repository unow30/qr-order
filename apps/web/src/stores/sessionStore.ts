import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  sessionToken: string | null;
  tableId: string | null;
  tableNumber: number | null;
  tableName: string | null;
  expiresAt: string | null;
  pin: string | null;
  setSession: (data: {
    sessionToken: string;
    tableId: string;
    tableNumber: number;
    tableName: string;
    expiresAt: string;
    pin?: string;
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
      pin: null,
      setSession: (data) => set({ ...data, pin: data.pin ?? null }),
      clearSession: () =>
        set({
          sessionToken: null,
          tableId: null,
          tableNumber: null,
          tableName: null,
          expiresAt: null,
          pin: null,
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
