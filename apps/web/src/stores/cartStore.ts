import { create } from 'zustand';
import { Cart, CartItem } from '@qr-order/shared-types';

interface CartState {
  items: CartItem[];
  totalAmount: number;
  setCart: (cart: Cart) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()((set) => ({
  items: [],
  totalAmount: 0,
  setCart: (cart) => set({ items: cart.items, totalAmount: cart.totalAmount }),
  clearCart: () => set({ items: [], totalAmount: 0 }),
}));
