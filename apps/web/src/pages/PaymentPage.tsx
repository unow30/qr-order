import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { useOrderStore } from '../stores/orderStore';
import { createOrder } from '../api/order.api';
import { createPayment, confirmPayment } from '../api/payment.api';
import { PaymentMethod } from '@qr-order/shared-types';

export default function PaymentPage() {
  const navigate = useNavigate();
  const { items, totalAmount, clearCart } = useCartStore();
  const setOrder = useOrderStore((s) => s.setOrder);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CARD);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');

  const handlePayment = async () => {
    if (items.length === 0) return;
    setLoading(true);
    try {
      // 1. 주문 생성
      const order = await createOrder({ note: note || undefined });
      setOrder(order);

      // 2. 결제 요청
      const paymentResult = await createPayment({
        orderId: order.id,
        method,
        amount: order.totalAmount,
      });

      // 3. PG 호스티드 결제창 (실제 구현시 PG SDK 사용)
      // 여기서는 시뮬레이션으로 바로 confirm 처리
      await confirmPayment({
        paymentId: paymentResult.paymentId,
        pgPaymentKey: `sim_${Date.now()}`,
        amount: paymentResult.amount,
      });

      clearCart();
      navigate(`/order-status/${order.id}`);
    } catch (err) {
      console.error(err);
      alert('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: 'sans-serif', paddingBottom: 100 }}>
      <header style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>←</button>
        <h2 style={{ margin: 0 }}>결제</h2>
      </header>

      <div style={{ padding: '0 16px' }}>
        {/* 주문 요약 */}
        <div style={{ background: '#f8f8f8', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>주문 요약</h3>
          {items.map((item) => (
            <div key={item.cartItemId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>{item.menuItemName} ×{item.quantity}</span>
              <span style={{ fontSize: 14 }}>{item.totalPrice.toLocaleString()}원</span>
            </div>
          ))}
          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>합계</span>
            <span>{totalAmount.toLocaleString()}원</span>
          </div>
        </div>

        {/* 결제 수단 */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>결제 수단</h3>
          {[
            { value: PaymentMethod.CARD, label: '카드' },
            { value: PaymentMethod.MOBILE, label: '간편결제' },
          ].map((opt) => (
            <div
              key={opt.value}
              onClick={() => setMethod(opt.value)}
              style={{
                padding: 16, borderRadius: 8, border: '1px solid',
                borderColor: method === opt.value ? '#ff6b35' : '#ddd',
                marginBottom: 8, cursor: 'pointer',
                background: method === opt.value ? '#fff5f2' : '#fff',
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>

        {/* 요청사항 */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>요청사항</h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="주문 요청사항을 입력해 주세요."
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 14, resize: 'none', boxSizing: 'border-box' }}
            rows={3}
          />
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 440 }}>
        <button
          onClick={handlePayment}
          disabled={loading || items.length === 0}
          style={{ width: '100%', padding: 16, background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? '처리 중...' : `${totalAmount.toLocaleString()}원 결제하기`}
        </button>
      </div>
    </div>
  );
}
