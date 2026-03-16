import { describe, it, expect, beforeEach } from 'vitest';
import { useOrderStore } from './orderStore';
import { OrderStatus } from '@qr-order/shared-types';

describe('useOrderStore', () => {
  beforeEach(() => {
    useOrderStore.getState().clearOrder();
  });

  describe('초기 상태', () => {
    it('주문이 없어야 한다', () => {
      const state = useOrderStore.getState();
      expect(state.currentOrder).toBeNull();
      expect(state.orderStatus).toBeNull();
    });
  });

  describe('setOrder', () => {
    it('주문 데이터를 설정하고 상태를 동기화해야 한다', () => {
      const order = {
        id: 'order-1',
        storeId: 'store-1',
        sessionId: 'session-1',
        tableId: 'table-1',
        tableNumber: 5,
        status: OrderStatus.PENDING,
        items: [],
        totalAmount: 14000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      useOrderStore.getState().setOrder(order);

      const state = useOrderStore.getState();
      expect(state.currentOrder).toEqual(order);
      expect(state.orderStatus).toBe(OrderStatus.PENDING);
    });
  });

  describe('updateStatus', () => {
    it('주문 상태를 업데이트해야 한다', () => {
      const order = {
        id: 'order-1',
        storeId: 'store-1',
        sessionId: 'session-1',
        tableId: 'table-1',
        tableNumber: 5,
        status: OrderStatus.PENDING,
        items: [],
        totalAmount: 14000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      useOrderStore.getState().setOrder(order);
      useOrderStore.getState().updateStatus(OrderStatus.CONFIRMED);

      const state = useOrderStore.getState();
      expect(state.orderStatus).toBe(OrderStatus.CONFIRMED);
      expect(state.currentOrder?.status).toBe(OrderStatus.CONFIRMED);
    });

    it('주문이 없을 때 상태를 업데이트해도 currentOrder는 null이어야 한다', () => {
      useOrderStore.getState().updateStatus(OrderStatus.CONFIRMED);

      const state = useOrderStore.getState();
      expect(state.orderStatus).toBe(OrderStatus.CONFIRMED);
      expect(state.currentOrder).toBeNull();
    });
  });

  describe('clearOrder', () => {
    it('주문 데이터를 초기화해야 한다', () => {
      useOrderStore.getState().setOrder({
        id: 'order-1',
        storeId: 'store-1',
        sessionId: 'session-1',
        tableId: 'table-1',
        tableNumber: 5,
        status: OrderStatus.PENDING,
        items: [],
        totalAmount: 14000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      useOrderStore.getState().clearOrder();

      const state = useOrderStore.getState();
      expect(state.currentOrder).toBeNull();
      expect(state.orderStatus).toBeNull();
    });
  });
});
