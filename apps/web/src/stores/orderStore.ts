import { create } from 'zustand';
import { Order, OrderStatus } from '@qr-order/shared-types';

interface OrderState {
  currentOrder: Order | null;
  orderStatus: OrderStatus | null;
  setOrder: (order: Order) => void;
  updateStatus: (status: OrderStatus) => void;
  clearOrder: () => void;
}

export const useOrderStore = create<OrderState>()((set) => ({
  currentOrder: null,
  orderStatus: null,
  setOrder: (order) => set({ currentOrder: order, orderStatus: order.status }),
  updateStatus: (status) =>
    set((state) => ({
      orderStatus: status,
      currentOrder: state.currentOrder ? { ...state.currentOrder, status } : null,
    })),
  clearOrder: () => set({ currentOrder: null, orderStatus: null }),
}));
