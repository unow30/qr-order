import { create } from 'zustand';
import { Order, OrderStatus } from '@qr-order/shared-types';

interface OrderState {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  removeOrder: (orderId: string) => void;
  clearOrders: () => void;
}

export const useOrderStore = create<OrderState>()((set) => ({
  orders: [],
  setOrders: (orders) => set({ orders }),
  addOrder: (order) =>
    set((state) => {
      const idx = state.orders.findIndex((o) => o.id === order.id);
      if (idx >= 0) {
        const newOrders = [...state.orders];
        newOrders[idx] = order;
        return { orders: newOrders };
      }
      return { orders: [...state.orders, order] };
    }),
  updateOrder: (order) =>
    set((state) => ({
      orders: state.orders.map((o) => (o.id === order.id ? order : o)),
    })),
  removeOrder: (orderId) =>
    set((state) => ({
      orders: state.orders.filter((o) => o.id !== orderId),
    })),
  clearOrders: () => set({ orders: [] }),
}));
