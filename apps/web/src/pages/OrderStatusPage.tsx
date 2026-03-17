import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useOrderStore } from '../stores/orderStore';
import { useOrderSSE } from '../hooks/useOrderSSE';
import { getOrder } from '../api/order.api';
import { OrderStatus } from '@qr-order/shared-types';

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '주문 접수 중',
  [OrderStatus.CONFIRMED]: '주문 확인됨',
  [OrderStatus.PREPARING]: '조리 중',
  [OrderStatus.READY]: '서빙 준비 완료',
  [OrderStatus.SERVED]: '서빙 완료',
  [OrderStatus.CANCELLED]: '주문 취소됨',
};

const STATUS_STEPS = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
];

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const { currentOrder, orderStatus, setOrder } = useOrderStore();
  useOrderSSE(id ?? null);

  useEffect(() => {
    if (!id) return;
    getOrder(id).then(setOrder).catch(() => {});
  }, [id]);

  const currentStepIdx = orderStatus ? STATUS_STEPS.indexOf(orderStatus) : 0;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', fontSize: 20, marginBottom: 32 }}>주문 현황</h1>

      {/* 상태 표시 */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {orderStatus === OrderStatus.PREPARING ? '👨‍🍳' :
           orderStatus === OrderStatus.READY ? '🍽️' :
           orderStatus === OrderStatus.SERVED ? '✅' :
           orderStatus === OrderStatus.CANCELLED ? '❌' : '⏳'}
        </div>
        <h2 style={{ margin: '0 0 8px', color: '#ff6b35' }}>
          {orderStatus ? STATUS_LABELS[orderStatus] : '처리 중...'}
        </h2>
      </div>

      {/* 진행 단계 */}
      {orderStatus !== OrderStatus.CANCELLED && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 12, left: '10%', right: '10%', height: 2, background: '#f0f0f0' }} />
          {STATUS_STEPS.map((step, idx) => (
            <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', zIndex: 1,
                background: idx <= currentStepIdx ? '#ff6b35' : '#f0f0f0',
                border: '2px solid',
                borderColor: idx <= currentStepIdx ? '#ff6b35' : '#ddd',
              }} />
              <span style={{ fontSize: 10, marginTop: 8, color: idx <= currentStepIdx ? '#ff6b35' : '#aaa', textAlign: 'center' }}>
                {STATUS_LABELS[step].split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 주문 상세 */}
      {currentOrder && (
        <div style={{ background: '#f8f8f8', borderRadius: 12, padding: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>주문 내역</h3>
          {currentOrder.items?.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>{item.menuItemName} ×{item.quantity}</span>
              <span style={{ fontSize: 14 }}>{item.totalPrice.toLocaleString()}원</span>
            </div>
          ))}
          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '12px 0' }} />
          {currentOrder.discountAmount > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#888' }}>
                <span>소계</span>
                <span>{currentOrder.totalAmount.toLocaleString()}원</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#e74c3c' }}>
                <span>할인</span>
                <span>-{currentOrder.discountAmount.toLocaleString()}원</span>
              </div>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>합계</span>
            <span>{currentOrder.finalAmount.toLocaleString()}원</span>
          </div>
        </div>
      )}
    </div>
  );
}
