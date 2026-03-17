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

const STATUS_STYLE: Record<OrderStatus, { border: string; badgeBg: string; badgeColor: string }> = {
  [OrderStatus.PENDING]:   { border: '#ff9800', badgeBg: '#fff3e0', badgeColor: '#e65100' },
  [OrderStatus.CONFIRMED]: { border: '#2196f3', badgeBg: '#e3f2fd', badgeColor: '#0d47a1' },
  [OrderStatus.PREPARING]: { border: '#4caf50', badgeBg: '#e8f5e9', badgeColor: '#2e7d32' },
  [OrderStatus.READY]:     { border: '#9c27b0', badgeBg: '#f3e5f5', badgeColor: '#4a148c' },
  [OrderStatus.SERVED]:    { border: '#9e9e9e', badgeBg: '#f5f5f5', badgeColor: '#616161' },
  [OrderStatus.CANCELLED]: { border: '#e53935', badgeBg: '#ffebee', badgeColor: '#b71c1c' },
};

// CONFIRMED·PREPARING 상태는 주방(KDS)에서 제어하므로 주문관리에서 버튼 미노출
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.PENDING]: OrderStatus.CONFIRMED,
  [OrderStatus.READY]: OrderStatus.SERVED,
};

export default function OrderManagePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);
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

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await updateOrderStatus(cancelTarget.id, { status: OrderStatus.CANCELLED });
      fetchOrders();
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  const activeOrders = orders
    .filter((o) => o.status !== OrderStatus.SERVED && o.status !== OrderStatus.CANCELLED)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (loading) return <div>주문 목록 불러오는 중...</div>;

  return (
    <div>
      {/* 취소 확인 모달 */}
      {cancelTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 28, width: 320,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>주문을 취소하시겠습니까?</h3>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#666' }}>
              {cancelTarget.tableNumber}번 테이블 · {cancelTarget.items?.length ?? 0}개 메뉴
            </p>
            <div style={{ background: '#f8f8f8', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
              {cancelTarget.items?.map((item) => (
                <div key={item.id} style={{ fontSize: 13, color: '#444', marginBottom: 4 }}>
                  {item.menuItemName} ×{item.quantity}
                </div>
              ))}
            </div>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#e53935', fontWeight: 600 }}>
              ⚠️ 취소 후에는 되돌릴 수 없습니다.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                style={{ flex: 1, padding: '10px 0', background: '#f5f5f5', color: '#333', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
              >
                돌아가기
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelling}
                style={{ flex: 1, padding: '10px 0', background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, cursor: cancelling ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: cancelling ? 0.7 : 1 }}
              >
                {cancelling ? '취소 중...' : '주문 취소'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        {activeOrders.map((order) => {
          const style = STATUS_STYLE[order.status];
          const nextStatus = NEXT_STATUS[order.status];
          return (
            <div
              key={order.id}
              style={{
                background: '#fff', borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* 헤더 */}
              <div style={{
                padding: '14px 20px',
                borderBottom: `3px solid ${style.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{order.tableNumber}번 테이블</h3>
                  {isAllStores && order.storeId && storeNameMap[order.storeId] && (
                    <span style={{ fontSize: 12, color: '#888', marginTop: 2, display: 'block' }}>
                      🏪 {storeNameMap[order.storeId]}
                    </span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                    background: style.badgeBg, color: style.badgeColor, marginBottom: 4,
                  }}>
                    {STATUS_LABELS[order.status]}
                  </span>
                  <div style={{ fontSize: 12, color: '#aaa' }}>
                    {new Date(order.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {nextStatus && (
                  <button
                    onClick={() => handleStatusChange(order, nextStatus)}
                    style={{ width: '100%', padding: '10px 0', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, letterSpacing: 0.5 }}
                  >
                    {STATUS_LABELS[nextStatus]} →
                  </button>
                )}
                <button
                  onClick={() => setCancelTarget(order)}
                  style={{ width: '100%', padding: '8px 0', background: '#fff', color: '#e53935', border: '1px solid #e53935', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
                >
                  주문 취소
                </button>
              </div>

              {/* 주문 항목 */}
              <div style={{ padding: '12px 20px', flex: 1 }}>
                {order.items?.map((item) => (
                  <div key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{item.menuItemName}</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#ff6b35' }}>×{item.quantity}</span>
                    </div>
                    {item.selectedOptions?.length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        {item.selectedOptions.map((opt) => (
                          <span key={opt.optionId} style={{ fontSize: 12, color: '#888', marginRight: 8 }}>
                            {opt.optionName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 요청사항 */}
              {order.note && (
                <div style={{ padding: '10px 20px', background: '#fffde7', borderTop: '1px solid #f0f0f0' }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#555' }}>📝 {order.note}</p>
                </div>
              )}
            </div>
          );
        })}
        {activeOrders.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 48, color: '#888' }}>
            현재 처리 중인 주문이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
