import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from '../stores/orderStore';
import { createPayment, confirmPayment } from '../api/payment.api';
import { PaymentMethod } from '@qr-order/shared-types';

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const { currentOrder, clearOrder } = useOrderStore();
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CARD);
  const [loading, setLoading] = useState(false);

  if (!currentOrder) {
    navigate('/menu', { replace: true });
    return null;
  }

  const handlePayment = async () => {
    setLoading(true);
    try {
      const paymentResult = await createPayment({
        orderId: currentOrder.id,
        method,
        amount: currentOrder.finalAmount ?? currentOrder.totalAmount,
      });

      await confirmPayment({
        paymentId: paymentResult.paymentId,
        pgPaymentKey: `sim_${Date.now()}`,
        amount: paymentResult.amount,
      });

      clearOrder();
      navigate('/menu', { replace: true });
    } catch {
      alert('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[480px] mx-auto font-sans pb-24">
      <header className="p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="bg-transparent border-none text-xl cursor-pointer">←</button>
        <h2 className="m-0">주문내역</h2>
      </header>

      <div className="px-4">
        {/* 주문 항목 */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <h3 className="text-[15px] mb-3">주문 항목</h3>
          {currentOrder.items?.map((item) => (
            <div key={item.id} className="flex justify-between mb-2">
              <span className="text-sm">{item.menuItemName} ×{item.quantity}</span>
              <span className="text-sm">{item.totalPrice.toLocaleString()}원</span>
            </div>
          ))}
          <hr className="border-t border-gray-200 my-3" />
          {currentOrder.discountAmount > 0 ? (
            <>
              <div className="flex justify-between text-[13px] text-gray-500 mb-1">
                <span>소계</span>
                <span>{currentOrder.totalAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-[13px] text-emerald-600 mb-2">
                <span>쿠폰 할인</span>
                <span>-{currentOrder.discountAmount.toLocaleString()}원</span>
              </div>
            </>
          ) : null}
          <div className="flex justify-between font-bold">
            <span>결제 금액</span>
            <span className="text-[#ff6b35]">{currentOrder.finalAmount.toLocaleString()}원</span>
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
              className={`p-4 rounded-lg border mb-2 cursor-pointer ${method === opt.value ? 'border-[#ff6b35] bg-orange-50' : 'border-gray-200 bg-white'}`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-[440px]">
        <button
          onClick={handlePayment}
          disabled={loading}
          className={`w-full p-4 bg-[#ff6b35] text-white border-none rounded-xl text-base cursor-pointer ${loading ? 'opacity-70' : ''}`}
        >
          {loading ? '처리 중...' : `${currentOrder.finalAmount.toLocaleString()}원 결제하기`}
        </button>
      </div>
    </div>
  );
}
