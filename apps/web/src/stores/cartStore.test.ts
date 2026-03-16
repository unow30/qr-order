import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './cartStore';

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  describe('초기 상태', () => {
    it('빈 장바구니여야 한다', () => {
      const state = useCartStore.getState();
      expect(state.items).toEqual([]);
      expect(state.totalAmount).toBe(0);
    });
  });

  describe('setCart', () => {
    it('장바구니 데이터를 설정해야 한다', () => {
      const cart = {
        sessionId: 'table-1',
        items: [
          {
            cartItemId: 'item-1',
            menuItemId: 'menu-1',
            menuItemName: '아메리카노',
            quantity: 2,
            unitPrice: 4500,
            totalPrice: 9000,
            selectedOptions: [],
          },
          {
            cartItemId: 'item-2',
            menuItemId: 'menu-2',
            menuItemName: '라떼',
            quantity: 1,
            unitPrice: 5000,
            totalPrice: 5000,
            selectedOptions: [],
          },
        ],
        totalAmount: 14000,
      };

      useCartStore.getState().setCart(cart);

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.totalAmount).toBe(14000);
      expect(state.items[0].menuItemName).toBe('아메리카노');
    });
  });

  describe('clearCart', () => {
    it('장바구니를 비워야 한다', () => {
      useCartStore.getState().setCart({
        sessionId: 'table-1',
        items: [
          {
            cartItemId: 'item-1',
            menuItemId: 'menu-1',
            menuItemName: '아메리카노',
            quantity: 1,
            unitPrice: 4500,
            totalPrice: 4500,
            selectedOptions: [],
          },
        ],
        totalAmount: 4500,
      });

      useCartStore.getState().clearCart();

      const state = useCartStore.getState();
      expect(state.items).toEqual([]);
      expect(state.totalAmount).toBe(0);
    });
  });
});
