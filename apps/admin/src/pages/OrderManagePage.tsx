import { useCallback, useEffect, useState } from 'react';
import { getOrders, updateOrderStatus } from '../api/order.api';
import { Order, OrderStatus } from '@qr-order/shared-types';
import { useAuthStore } from '../stores/authStore';
import { useStoreNames } from '../hooks/useStoreNames';
import { useOrdersSSE } from '../hooks/useOrdersSSE';

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '접수 대기',
  [OrderStatus.CONFIRMED]: '주문 확인',
  [OrderStatus.PREPARING]: '조리 중',
  [OrderStatus.READY]: '서빙 준비',
  [OrderStatus.SERVED]: '서빙 완료',
  [OrderStatus.CANCELLED]: '취소됨',
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.PENDING]: OrderStatus.CONFIRMED,
  [OrderStatus.CONFIRMED]: OrderStatus.PREPARING,
  [OrderStatus.PREPARING]: OrderStatus.READY,
  [OrderStatus.READY]: OrderStatus.SERVED,
};

export default function OrderManagePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentStoreId, isSuperAdmin } = useAuthStore();
  const superAdmin = isSuperAdmin();
  const isAllStores = superAdmin && !currentStoreId;
  const storeNameMap = useStoreNames();

  const fetchOrders = useCallback(() => {
    setLoading(true);
    getOrders().then(setOrders).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [currentStoreId, fetchOrders]);

  useOrdersSSE(fetchOrders);

  const handleStatusChange = async (order: Order, status: OrderStatus) => {
    await updateOrderStatus(order.id, { status });
    fetchOrders();
  };

  const activeOrders = orders.filter((o) => o.status !== OrderStatus.SERVED && o.status !== OrderStatus.CANCELLED);

  if (loading) return <div>주문 목록 불러오는 중...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>주문 관리</h2>
        {superAdmin && (
          <span style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
            background: isAllStores ? '#e8f5e9' : '#e3f2fd',
            color: isAllStores ? '#1b5e20' : '#0d47a1',
          }}>
            {isAllStores ? '전체 매장' : (storeNameMap[currentStoreId!] || '선택된 매장')}
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {activeOrders.map((order) => (
          <div key={order.id} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>{order.tableNumber}번 테이블</h3>
              <span style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: order.status === OrderStatus.PENDING ? '#fff3e0' : order.status === OrderStatus.PREPARING ? '#e8f5e9' : '#e3f2fd',
                color: order.status === OrderStatus.PENDING ? '#e65100' : order.status === OrderStatus.PREPARING ? '#1b5e20' : '#0d47a1',
              }}>
                {STATUS_LABELS[order.status]}
              </span>
            </div>
            {isAllStores && order.storeId && storeNameMap[order.storeId] && (
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                🏪 {storeNameMap[order.storeId]}
              </div>
            )}
            {order.items?.map((item) => (
              <div key={item.id} style={{ fontSize: 14, marginBottom: 4 }}>
                {item.menuItemName} ×{item.quantity}
              </div>
            ))}
            {order.note && (
              <p style={{ fontSize: 13, color: '#888', marginTop: 8, padding: '8px', background: '#f8f8f8', borderRadius: 6 }}>
                요청: {order.note}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {NEXT_STATUS[order.status] && (
                <button
                  onClick={() => handleStatusChange(order, NEXT_STATUS[order.status]!)}
                  style={{ flex: 1, padding: '8px 12px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
                >
                  {STATUS_LABELS[NEXT_STATUS[order.status]!]} →
                </button>
              )}
              {order.status !== OrderStatus.CANCELLED && (
                <button
                  onClick={() => handleStatusChange(order, OrderStatus.CANCELLED)}
                  style={{ padding: '8px 12px', background: '#fff', color: '#e53935', border: '1px solid #e53935', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
                >
                  취소
                </button>
              )}
            </div>
          </div>
        ))}
        {activeOrders.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 48, color: '#888' }}>
            현재 처리 중인 주문이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
