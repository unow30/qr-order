import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { useOrderStore } from '../stores/orderStore';
import { useCouponStore } from '../stores/couponStore';
import { createOrder } from '../api/order.api';
import { createPayment, confirmPayment } from '../api/payment.api';
import { PaymentMethod } from '@qr-order/shared-types';

export default function PaymentPage() {
  const navigate = useNavigate();
  const { items, totalAmount, clearCart } = useCartStore();
  const setOrder = useOrderStore((s) => s.setOrder);
  const { couponCode, discountAmount, finalAmount, clearCoupon } = useCouponStore();
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CARD);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');

  const payAmount = discountAmount > 0 ? finalAmount : totalAmount;

  const handlePayment = async () => {
    if (items.length === 0) return;
    setLoading(true);
    try {
      // 1. 주문 생성 (쿠폰 코드 포함)
      const order = await createOrder({
        note: note || undefined,
        couponCode: couponCode ?? undefined,
      });
      setOrder(order);

      // 2. 결제 요청 (finalAmount 사용)
      const paymentResult = await createPayment({
        orderId: order.id,
        method,
        amount: order.finalAmount ?? order.totalAmount,
      });

      // 3. 결제 확인 (시뮬레이션)
      await confirmPayment({
        paymentId: paymentResult.paymentId,
        pgPaymentKey: `sim_${Date.now()}`,
        amount: paymentResult.amount,
      });

      clearCart();
      clearCoupon();
      navigate(`/order-status/${order.id}`, { replace: true });
    } catch (err) {
      console.error(err);
      alert('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-120 mx-auto font-sans pb-24">
      <header className="p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="bg-transparent border-none text-xl cursor-pointer">←</button>
        <h2 className="m-0">결제</h2>
      </header>

      <div className="px-4">
        {/* 주문 요약 */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <h3 className="text-[15px] mb-3">주문 요약</h3>
          {items.map((item) => (
            <div key={item.cartItemId} className="flex justify-between mb-2">
              <span className="text-sm">{item.menuItemName} ×{item.quantity}</span>
              <span className="text-sm">{item.totalPrice.toLocaleString()}원</span>
            </div>
          ))}
          <hr className="border-t border-gray-200 my-3" />
          {discountAmount > 0 && (
            <>
              <div className="flex justify-between text-[13px] text-gray-500 mb-1">
                <span>소계</span>
                <span>{totalAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-[13px] text-emerald-600 mb-2">
                <span>🏷️ 쿠폰 할인 ({couponCode})</span>
                <span>-{discountAmount.toLocaleString()}원</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-bold">
            <span>최종 결제 금액</span>
            <span className="text-brand">{payAmount.toLocaleString()}원</span>
          </div>
        </div>

        {/* 결제 수단 */}
        <div className="mb-4">
          <h3 className="text-[15px] mb-3">결제 수단</h3>
          {[
            { value: PaymentMethod.CARD, label: '카드' },
            { value: PaymentMethod.MOBILE, label: '간편결제' },
          ].map((opt) => (
            <div
              key={opt.value}
              onClick={() => setMethod(opt.value)}
              className={`p-4 rounded-lg border mb-2 cursor-pointer ${method === opt.value ? 'border-brand bg-orange-50' : 'border-gray-200 bg-white'}`}
            >
              {opt.label}
            </div>
          ))}
        </div>

        {/* 요청사항 */}
        <div className="mb-4">
          <h3 className="text-[15px] mb-2">요청사항</h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="주문 요청사항을 입력해 주세요."
            className="w-full p-3 rounded-lg border border-gray-200 text-sm resize-none box-border"
            rows={3}
          />
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-110">
        <button
          onClick={handlePayment}
          disabled={loading || items.length === 0}
          className={`w-full p-4 bg-brand text-white border-none rounded-xl text-base cursor-pointer ${loading ? 'opacity-70' : ''}`}
        >
          {loading ? '처리 중...' : `${payAmount.toLocaleString()}원 결제하기`}
        </button>
      </div>
    </div>
  );
}
