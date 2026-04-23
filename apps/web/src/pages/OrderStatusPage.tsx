import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderSSE } from '@web/hooks/useOrderSSE';
import { getOrder } from '@web/api/order.api';
import { Order, OrderStatus } from '@qr-order/shared-types';

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

const STATUS_ICON: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '⏳',
  [OrderStatus.CONFIRMED]: '📋',
  [OrderStatus.PREPARING]: '👨‍🍳',
  [OrderStatus.READY]: '🍽️',
  [OrderStatus.SERVED]: '✅',
  [OrderStatus.CANCELLED]: '❌',
};

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<OrderStatus | null>(null);

  const handleStatusChange = useCallback((newStatus: OrderStatus) => {
    setStatus(newStatus);
  }, []);

  useOrderSSE(id ?? null, handleStatusChange);

  useEffect(() => {
    if (!id) return;
    getOrder(id)
      .then((o) => {
        setOrder(o);
        setStatus(o.status);
      })
      .catch(() => {});
  }, [id]);

  const currentStepIdx = status ? STATUS_STEPS.indexOf(status) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="px-4 py-3 bg-white border-b border-zinc-100 sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-zinc-700 text-lg leading-none w-7 h-7 flex items-center justify-center"
        >
          ←
        </button>
        <h1 className="text-base font-extrabold text-zinc-900 tracking-[-0.3px]">주문 현황</h1>
      </header>

      {/* 상태 표시 */}
      <div className="flex flex-col items-center gap-2.5 px-6 pt-8 pb-6">
        <div className="w-16 h-16 rounded-[10px] bg-brand-50 flex items-center justify-center text-3xl">
          {status ? STATUS_ICON[status] : '⏳'}
        </div>
        <h2 className="text-lg font-extrabold text-zinc-900 tracking-[-0.3px] text-center">
          {status ? STATUS_LABELS[status] : '처리 중...'}
        </h2>
        {status === OrderStatus.SERVED && (
          <p className="text-xs text-zinc-500 text-center">맛있게 드세요!</p>
        )}
      </div>

      {/* 진행 단계 */}
      {status !== OrderStatus.CANCELLED && (
        <div className="flex justify-between items-start px-6 mb-6 relative">
          <div className="absolute top-3 left-[15%] right-[15%] h-0.5 bg-zinc-100" />
          {STATUS_STEPS.map((step, idx) => (
            <div key={step} className="flex flex-col items-center flex-1 z-10">
              <div
                className={`w-6 h-6 rounded-full border-2 ${
                  idx <= currentStepIdx
                    ? 'bg-brand-500 border-brand-500'
                    : 'bg-zinc-100 border-zinc-300'
                }`}
              />
              <span
                className={`text-[10px] mt-1.5 text-center font-semibold tracking-[0.2px] ${
                  idx <= currentStepIdx ? 'text-brand-700' : 'text-zinc-400'
                }`}
              >
                {STATUS_LABELS[step].split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 주문 상세 */}
      {order && (
        <div className="flex-1">
          <div className="px-4 py-3 bg-zinc-50 border-y border-zinc-100">
            <p className="text-sm font-bold text-zinc-900">주문 내역</p>
          </div>
          {order.items?.filter((i) => !i.cancelledAt).map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center px-4 py-3.5 border-b border-zinc-100"
            >
              <span className="text-[13px] text-zinc-800 flex-1 truncate">
                {item.menuItemName} ×{item.quantity}
              </span>
              <span className="text-[13px] font-bold text-zinc-900">
                {item.totalPrice.toLocaleString()}원
              </span>
            </div>
          ))}
          <div className="px-4 py-4">
            {order.discountAmount > 0 && (
              <>
                <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                  <span>소계</span>
                  <span>{order.totalAmount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-[11px] text-brand-700 mb-2">
                  <span>할인</span>
                  <span>−{order.discountAmount.toLocaleString()}원</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
              <span className="text-sm font-bold text-zinc-900">합계</span>
              <span className="text-lg font-extrabold text-zinc-900">
                {order.finalAmount.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 하단 sticky CTA */}
      <div className="flex flex-col gap-2 px-3.5 py-3.5 border-t border-zinc-100 bg-white sticky bottom-0">
        <button
          onClick={() => navigate('/menu', { replace: true })}
          className="w-full h-11 rounded-xl bg-brand-500 text-white text-[13px] font-bold tracking-[-0.1px]"
        >
          메뉴 더 주문하기
        </button>
      </div>
    </div>
  );
}
