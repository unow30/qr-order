import { useCallback, useEffect, useState } from 'react';
import { getOrders, updateOrderStatus } from '../api/order.api';
import { Order, OrderStatus } from '@qr-order/shared-types';
import { useAuthStore } from '../stores/authStore';
import { useStoreNames } from '../hooks/useStoreNames';
import { useOrdersSSE } from '../hooks/useOrdersSSE';

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const { currentStoreId, isSuperAdmin } = useAuthStore();
  const superAdmin = isSuperAdmin();
  const isAllStores = superAdmin && !currentStoreId;
  const storeNameMap = useStoreNames();

  const fetchOrders = useCallback(() =>
    getOrders().then((all) =>
      setOrders(all.filter((o) => o.status === OrderStatus.CONFIRMED || o.status === OrderStatus.PREPARING)),
    ), []);

  useEffect(() => {
    fetchOrders();
  }, [currentStoreId, fetchOrders]);

  useOrdersSSE(fetchOrders);

  const handleStartPreparing = async (id: string) => {
    await updateOrderStatus(id, { status: OrderStatus.PREPARING });
    fetchOrders();
  };

  const handleReady = async (id: string) => {
    await updateOrderStatus(id, { status: OrderStatus.READY });
    fetchOrders();
  };

  return (
    <div style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0 }}>주방 디스플레이 (KDS)</h2>
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
        <span style={{ fontSize: 13, color: '#888' }}>실시간 업데이트</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {orders.map((order) => (
          <div
            key={order.id}
            style={{
              background: '#fff', borderRadius: 12, padding: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderTop: `4px solid ${order.status === OrderStatus.PREPARING ? '#4caf50' : '#ff9800'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 20 }}>{order.tableNumber}번 테이블</h3>
              <span style={{ fontSize: 12, color: '#888' }}>
                {new Date(order.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {isAllStores && order.storeId && storeNameMap[order.storeId] && (
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                🏪 {storeNameMap[order.storeId]}
              </div>
            )}
            {order.items?.map((item) => (
              <div key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{item.menuItemName}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#ff6b35' }}>×{item.quantity}</span>
                </div>
                {item.selectedOptions?.map((opt) => (
                  <span key={opt.optionId} style={{ fontSize: 12, color: '#888', marginRight: 8 }}>
                    {opt.optionName}
                  </span>
                ))}
              </div>
            ))}
            {order.note && (
              <p style={{ fontSize: 13, color: '#555', marginTop: 12, padding: 8, background: '#fffde7', borderRadius: 6 }}>
                📝 {order.note}
              </p>
            )}
            <div style={{ marginTop: 16 }}>
              {order.status === OrderStatus.CONFIRMED && (
                <button
                  onClick={() => handleStartPreparing(order.id)}
                  style={{ width: '100%', padding: 10, background: '#4caf50', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
                >
                  조리 시작
                </button>
              )}
              {order.status === OrderStatus.PREPARING && (
                <button
                  onClick={() => handleReady(order.id)}
                  style={{ width: '100%', padding: 10, background: '#3f51b5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
                >
                  서빙 준비 완료
                </button>
              )}
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 80, color: '#888' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p>현재 조리 중인 주문이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
