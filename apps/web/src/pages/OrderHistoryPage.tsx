import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from '@web/stores/orderStore';
import { getMyOrders, cancelOrderItem } from '@web/api/order.api';
import { createPayment, confirmPayment } from '@web/api/payment.api';
import { Order, OrderStatus, PaymentMethod } from '@qr-order/shared-types';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  [OrderStatus.PENDING]: { label: '대기중', color: 'bg-orange-100 text-orange-700' },
  [OrderStatus.CONFIRMED]: { label: '결제완료', color: 'bg-gray-100 text-gray-600' },
  [OrderStatus.PREPARING]: { label: '조리중', color: 'bg-gray-100 text-gray-600' },
  [OrderStatus.READY]: { label: '서빙대기', color: 'bg-gray-100 text-gray-600' },
  [OrderStatus.SERVED]: { label: '서빙완료', color: 'bg-gray-100 text-gray-600' },
  [OrderStatus.CANCELLED]: { label: '취소됨', color: 'bg-red-100 text-red-600' },
};

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const { orders, setOrders, updateOrder, removeOrder } = useOrderStore();
  const [loading, setLoading] = useState(true);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [cancellingItemId, setCancellingItemId] = useState<string | null>(null);

  useEffect(() => {
    getMyOrders()
      .then((data) => {
        setOrders(data.filter((o) => o.status === OrderStatus.PENDING));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCancelItem = async (order: Order, itemId: string) => {
    setCancellingItemId(itemId);
    try {
      const updated = await cancelOrderItem(order.id, itemId);
      if (updated.status === OrderStatus.CANCELLED) {
        removeOrder(order.id);
      } else {
        updateOrder(updated);
      }
    } catch {
      alert('취소 처리 중 오류가 발생했습니다.');
    } finally {
      setCancellingItemId(null);
    }
  };

  const handlePayment = async (order: Order) => {
    setPayingOrderId(order.id);
    try {
      const paymentResult = await createPayment({
        orderId: order.id,
        method: PaymentMethod.CARD,
        amount: order.finalAmount ?? order.totalAmount,
      });
      await confirmPayment({
        paymentId: paymentResult.paymentId,
        pgPaymentKey: `sim_${Date.now()}`,
        amount: paymentResult.amount,
      });
      navigate('/payment-complete', { replace: true });
    } catch {
      alert('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setPayingOrderId(null);
    }
  };

  if (loading) {
    return <div className="max-w-120 mx-auto p-4">주문내역을 불러오는 중...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-120 mx-auto p-8 font-sans text-center">
        <header className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="bg-transparent border-none text-xl cursor-pointer">←</button>
          <h2 className="m-0">주문내역</h2>
        </header>
        <p className="text-gray-400">주문 내역이 없습니다.</p>
        <button
          onClick={() => navigate('/menu')}
          className="mt-4 px-6 py-3 bg-brand text-white border-none rounded-lg cursor-pointer"
        >
          메뉴 보기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-120 mx-auto font-sans pb-6">
      <header className="p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="bg-transparent border-none text-xl cursor-pointer">←</button>
        <h2 className="m-0">주문내역</h2>
      </header>

      <div className="px-4 space-y-4">
        {orders.map((order) => {
          const isPending = order.status === OrderStatus.PENDING;
          const activeItems = order.items?.filter((i) => !i.cancelledAt) ?? [];
          const cfg = STATUS_CONFIG[order.status];

          return (
            <div key={order.id} className="bg-gray-50 rounded-xl p-4">
              {/* 주문 헤더 */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-[13px] text-gray-500">
                  {new Date(order.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>

              {/* 주문 항목 */}
              {activeItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center mb-2">
                  <div className="flex-1">
                    <span className="text-sm">{item.menuItemName} ×{item.quantity}</span>
                    {item.selectedOptions?.length > 0 && (
                      <p className="text-[11px] text-gray-400 mt-0.5 mb-0">
                        {item.selectedOptions.map((o) => o.optionName).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.totalPrice.toLocaleString()}원</span>
                    {isPending && (
                      <button
                        onClick={() => handleCancelItem(order, item.id)}
                        disabled={cancellingItemId === item.id}
                        className="text-red-400 bg-transparent border-none cursor-pointer text-lg leading-none disabled:opacity-50"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* 취소 불가 안내 */}
              {!isPending && order.status !== OrderStatus.CANCELLED && (
                <p className="text-[11px] text-gray-400 mt-1 mb-0">
                  {cfg.label} 상태에서는 취소할 수 없습니다
                </p>
              )}

              <hr className="border-t border-gray-200 my-3" />

              {/* 금액 */}
              {order.discountAmount > 0 && (
                <>
                  <div className="flex justify-between text-[13px] text-gray-500 mb-1">
                    <span>소계</span>
                    <span>{order.totalAmount.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-[13px] text-emerald-600 mb-2">
                    <span>쿠폰 할인</span>
                    <span>-{order.discountAmount.toLocaleString()}원</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-bold">
                <span>결제 금액</span>
                <span className="text-brand">{order.finalAmount.toLocaleString()}원</span>
              </div>

              {/* PENDING: 추가 주문 + 결제 버튼 */}
              {isPending && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => navigate('/menu')}
                    className="flex-1 p-3 bg-gray-200 text-gray-700 border-none rounded-lg text-sm cursor-pointer"
                  >
                    추가 주문하기
                  </button>
                  <button
                    onClick={() => handlePayment(order)}
                    disabled={payingOrderId === order.id}
                    className={`flex-1 p-3 bg-brand text-white border-none rounded-lg text-sm cursor-pointer ${payingOrderId === order.id ? 'opacity-70' : ''}`}
                  >
                    {payingOrderId === order.id
                      ? '처리 중...'
                      : `${order.finalAmount.toLocaleString()}원 결제하기`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
