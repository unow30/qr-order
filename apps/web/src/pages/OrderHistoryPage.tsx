import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useOrderStore } from '@web/stores/orderStore';
import { useSessionStore } from '@web/stores/sessionStore';
import { getMyOrders, cancelOrderItem } from '@web/api/order.api';
import { createPayment, confirmPayment } from '@web/api/payment.api';
import { Order, OrderStatus, PaymentMethod } from '@qr-order/shared-types';

const STATUS_CONFIG: Record<OrderStatus, { label: string; pill: string }> = {
  [OrderStatus.PENDING]: { label: '대기중', pill: 'bg-brand-50 text-brand-700' },
  [OrderStatus.CONFIRMED]: { label: '결제완료', pill: 'bg-blue-50 text-blue-700' },
  [OrderStatus.PREPARING]: { label: '조리중', pill: 'bg-blue-50 text-blue-700' },
  [OrderStatus.READY]: { label: '서빙대기', pill: 'bg-blue-50 text-blue-700' },
  [OrderStatus.SERVED]: { label: '서빙완료', pill: 'bg-zinc-100 text-zinc-700' },
  [OrderStatus.CANCELLED]: { label: '취소됨', pill: 'bg-red-50 text-red-700' },
};

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const sessionToken = useSessionStore((s) => s.sessionToken);
  const { orders, setOrders, updateOrder, removeOrder } = useOrderStore();

  if (!sessionToken) {
    return <Navigate to="/store" replace />;
  }
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
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-5">
        <div
          className="w-11 h-11 rounded-full border-[3px] border-zinc-100 border-t-brand-500"
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <p className="text-[11px] text-zinc-500">주문내역을 불러오는 중...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <header className="px-4 py-3 bg-white border-b border-zinc-100 sticky top-0 z-10 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-zinc-700 text-lg leading-none w-7 h-7 flex items-center justify-center"
          >
            ←
          </button>
          <h1 className="text-base font-extrabold text-zinc-900 tracking-[-0.3px]">주문내역</h1>
        </header>
        <div className="flex flex-col items-center justify-center flex-1 gap-2 px-6 text-center">
          <div className="w-12 h-12 rounded-[10px] bg-zinc-100 flex items-center justify-center text-xl">
            📋
          </div>
          <p className="text-sm font-bold text-zinc-900">주문 내역이 없어요</p>
          <p className="text-[11px] text-zinc-500">메뉴에서 주문을 시작해 보세요</p>
          <button
            onClick={() => navigate('/menu')}
            className="mt-4 px-5 h-11 rounded-xl bg-zinc-900 text-white text-[13px] font-bold tracking-[-0.1px]"
          >
            메뉴 보기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="px-4 py-3 bg-white border-b border-zinc-100 sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-zinc-700 text-lg leading-none w-7 h-7 flex items-center justify-center"
        >
          ←
        </button>
        <h1 className="text-base font-extrabold text-zinc-900 tracking-[-0.3px]">주문내역</h1>
      </header>

      <div className="flex-1">
        {orders.map((order) => {
          const isPending = order.status === OrderStatus.PENDING;
          const activeItems = order.items?.filter((i) => !i.cancelledAt) ?? [];
          const cfg = STATUS_CONFIG[order.status];

          return (
            <div key={order.id} className="px-4 py-3.5 border-b border-zinc-100">
              {/* 주문 헤더 */}
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[11px] text-zinc-500">
                  {new Date(order.createdAt).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[0.2px] ${cfg.pill}`}
                >
                  {cfg.label}
                </span>
              </div>

              {/* 항목 */}
              {activeItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center mb-1.5">
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] text-zinc-800">
                      {item.menuItemName} ×{item.quantity}
                    </span>
                    {item.selectedOptions?.length > 0 && (
                      <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">
                        {item.selectedOptions.map((o) => o.optionName).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-zinc-900">
                      {item.totalPrice.toLocaleString()}원
                    </span>
                    {isPending && (
                      <button
                        onClick={() => handleCancelItem(order, item.id)}
                        disabled={cancellingItemId === item.id}
                        className="text-zinc-400 hover:text-zinc-600 text-base leading-none disabled:opacity-50"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {!isPending && order.status !== OrderStatus.CANCELLED && (
                <p className="text-[11px] text-zinc-400 mt-1">
                  {cfg.label} 상태에서는 취소할 수 없습니다
                </p>
              )}

              {/* 금액 */}
              <div className="mt-3 pt-3 border-t border-zinc-100">
                {order.discountAmount > 0 && (
                  <>
                    <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                      <span>소계</span>
                      <span>{order.totalAmount.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-brand-700 mb-1.5">
                      <span>쿠폰 할인</span>
                      <span>−{order.discountAmount.toLocaleString()}원</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-bold text-zinc-900">결제 금액</span>
                  <span className="text-sm font-extrabold text-zinc-900">
                    {order.finalAmount.toLocaleString()}원
                  </span>
                </div>
              </div>

              {isPending && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => navigate('/menu')}
                    className="flex-1 h-11 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold tracking-[-0.1px]"
                  >
                    메뉴 더보기
                  </button>
                  <button
                    onClick={() => handlePayment(order)}
                    disabled={payingOrderId === order.id}
                    className="flex-1 h-11 rounded-xl bg-brand-500 text-white text-[13px] font-bold tracking-[-0.1px] disabled:opacity-50"
                  >
                    {payingOrderId === order.id
                      ? '처리 중...'
                      : `${order.finalAmount.toLocaleString()}원 결제`}
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
