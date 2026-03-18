import { describe, it, expect, beforeEach } from 'vitest';
import { useOrderStore } from '@web/stores/orderStore';
import { OrderStatus } from '@qr-order/shared-types';

const makeOrder = (overrides = {}) => ({
  id: 'order-1',
  storeId: 'store-1',
  sessionId: 'session-1',
  tableId: 'table-1',
  tableNumber: 5,
  status: OrderStatus.PENDING,
  items: [],
  totalAmount: 14000,
  discountAmount: 0,
  finalAmount: 14000,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('useOrderStore', () => {
  beforeEach(() => {
    useOrderStore.getState().clearOrders();
  });

  describe('초기 상태', () => {
    it('주문이 없어야 한다', () => {
      const state = useOrderStore.getState();
      expect(state.orders).toEqual([]);
    });
  });

  describe('setOrders', () => {
    it('주문 목록을 설정해야 한다', () => {
      const orders = [makeOrder(), makeOrder({ id: 'order-2' })];
      useOrderStore.getState().setOrders(orders);

      expect(useOrderStore.getState().orders).toHaveLength(2);
    });
  });

  describe('addOrder', () => {
    it('주문을 추가해야 한다', () => {
      useOrderStore.getState().addOrder(makeOrder());
      expect(useOrderStore.getState().orders).toHaveLength(1);
    });

    it('여러 주문을 누적해야 한다', () => {
      useOrderStore.getState().addOrder(makeOrder());
      useOrderStore.getState().addOrder(makeOrder({ id: 'order-2' }));
      expect(useOrderStore.getState().orders).toHaveLength(2);
    });

    it('같은 id의 주문이 있으면 교체해야 한다 (upsert)', () => {
      useOrderStore.getState().addOrder(makeOrder({ totalAmount: 14000 }));
      useOrderStore.getState().addOrder(makeOrder({ totalAmount: 20000 }));

      const orders = useOrderStore.getState().orders;
      expect(orders).toHaveLength(1);
      expect(orders[0].totalAmount).toBe(20000);
    });

    it('upsert 시 다른 주문에 영향을 주지 않아야 한다', () => {
      useOrderStore.getState().addOrder(makeOrder());
      useOrderStore.getState().addOrder(makeOrder({ id: 'order-2' }));
      useOrderStore.getState().addOrder(makeOrder({ totalAmount: 20000 }));

      const orders = useOrderStore.getState().orders;
      expect(orders).toHaveLength(2);
      expect(orders[0].totalAmount).toBe(20000);
      expect(orders[1].id).toBe('order-2');
    });
  });

  describe('updateOrder', () => {
    it('해당 주문을 교체해야 한다', () => {
      useOrderStore.getState().addOrder(makeOrder());
      const updated = makeOrder({ status: OrderStatus.CONFIRMED, totalAmount: 10000 });
      useOrderStore.getState().updateOrder(updated);

      const order = useOrderStore.getState().orders[0];
      expect(order.status).toBe(OrderStatus.CONFIRMED);
      expect(order.totalAmount).toBe(10000);
    });

    it('다른 주문에 영향을 주지 않아야 한다', () => {
      useOrderStore.getState().addOrder(makeOrder());
      useOrderStore.getState().addOrder(makeOrder({ id: 'order-2' }));
      useOrderStore.getState().updateOrder(makeOrder({ status: OrderStatus.CONFIRMED }));

      const orders = useOrderStore.getState().orders;
      expect(orders[0].status).toBe(OrderStatus.CONFIRMED);
      expect(orders[1].status).toBe(OrderStatus.PENDING);
    });
  });

  describe('removeOrder', () => {
    it('주문을 제거해야 한다', () => {
      useOrderStore.getState().addOrder(makeOrder());
      useOrderStore.getState().addOrder(makeOrder({ id: 'order-2' }));
      useOrderStore.getState().removeOrder('order-1');

      const orders = useOrderStore.getState().orders;
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe('order-2');
    });
  });

  describe('clearOrders', () => {
    it('모든 주문을 초기화해야 한다', () => {
      useOrderStore.getState().addOrder(makeOrder());
      useOrderStore.getState().addOrder(makeOrder({ id: 'order-2' }));
      useOrderStore.getState().clearOrders();

      expect(useOrderStore.getState().orders).toEqual([]);
    });
  });
});
