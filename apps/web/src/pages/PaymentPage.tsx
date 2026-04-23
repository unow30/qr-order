import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@web/stores/cartStore';
import { useOrderStore } from '@web/stores/orderStore';
import { useCouponStore } from '@web/stores/couponStore';
import { createOrder } from '@web/api/order.api';
import { createPayment, confirmPayment } from '@web/api/payment.api';
import { PaymentMethod } from '@qr-order/shared-types';

export default function PaymentPage() {
  const navigate = useNavigate();
  const { items, totalAmount, clearCart } = useCartStore();
  const addOrder = useOrderStore((s) => s.addOrder);
  const { couponCode, discountAmount, finalAmount, clearCoupon } = useCouponStore();
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CARD);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');

  const payAmount = discountAmount > 0 ? finalAmount : totalAmount;

  const handlePayment = async () => {
    if (items.length === 0) return;
    setLoading(true);
    try {
      const order = await createOrder({
        note: note || undefined,
        couponCode: couponCode ?? undefined,
      });
      addOrder(order);

      const paymentResult = await createPayment({
        orderId: order.id,
        method,
        amount: order.finalAmount ?? order.totalAmount,
      });

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

  const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
    { value: PaymentMethod.CARD, label: '카드', icon: '💳' },
    { value: PaymentMethod.MOBILE, label: '간편결제', icon: '📱' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="px-4 py-3 bg-white border-b border-zinc-100 sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-zinc-700 text-lg leading-none w-7 h-7 flex items-center justify-center"
        >
          ←
        </button>
        <h1 className="text-base font-extrabold text-zinc-900 tracking-[-0.3px]">결제</h1>
      </header>

      <div className="flex-1">
        {/* 주문 요약 */}
        <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100">
          <p className="text-sm font-bold text-zinc-900">주문 요약</p>
        </div>
        {items.map((item) => (
          <div
            key={item.cartItemId}
            className="flex justify-between items-center px-4 py-3 border-b border-zinc-100"
          >
            <span className="text-[13px] text-zinc-800 flex-1 truncate">
              {item.menuItemName} ×{item.quantity}
            </span>
            <span className="text-[13px] font-bold text-zinc-900">
              {item.totalPrice.toLocaleString()}원
            </span>
          </div>
        ))}

        {/* 합계 */}
        <div className="px-4 py-4 border-b border-zinc-100">
          {discountAmount > 0 && (
            <>
              <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                <span>소계</span>
                <span>{totalAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-[11px] text-brand-700 mb-2">
                <span>쿠폰 할인 ({couponCode})</span>
                <span>−{discountAmount.toLocaleString()}원</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-zinc-900">최종 결제 금액</span>
            <span className="text-lg font-extrabold text-zinc-900">
              {payAmount.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* 결제 수단 */}
        <div className="px-4 py-4 border-b border-zinc-100">
          <p className="mb-2.5 text-sm font-bold text-zinc-900">결제 수단</p>
          <div className="flex flex-col gap-2">
            {PAYMENT_OPTIONS.map((opt) => {
              const active = method === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setMethod(opt.value)}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                    active
                      ? 'border-zinc-900 bg-zinc-50'
                      : 'border-zinc-200 bg-white'
                  }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <span className={`text-[13px] ${active ? 'font-bold text-zinc-900' : 'text-zinc-700'}`}>
                    {opt.label}
                  </span>
                  <span
                    className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      active ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300'
                    }`}
                  >
                    {active && <span className="text-white text-[10px] leading-none">✓</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 요청사항 */}
        <div className="px-4 py-4">
          <p className="mb-2 text-sm font-bold text-zinc-900">요청사항</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="주문 요청사항을 입력해 주세요."
            className="w-full border-2 border-zinc-200 rounded-[10px] focus:border-zinc-900 focus:outline-none bg-white px-3 py-2.5 text-sm resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* 하단 sticky CTA */}
      <div className="flex flex-col gap-2 px-3.5 py-3.5 border-t border-zinc-100 bg-white sticky bottom-0">
        <button
          onClick={handlePayment}
          disabled={loading || items.length === 0}
          className="w-full h-11 rounded-xl bg-brand-500 text-white text-[13px] font-bold tracking-[-0.1px] disabled:opacity-50"
        >
          {loading ? '처리 중...' : `${payAmount.toLocaleString()}원 결제하기`}
        </button>
      </div>
    </div>
  );
}
