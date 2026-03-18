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
    <div className="max-w-[480px] mx-auto p-6 font-sans">
      <h1 className="text-center text-xl mb-8">주문 현황</h1>

      {/* 상태 표시 */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">
          {status === OrderStatus.PREPARING ? '👨‍🍳' :
           status === OrderStatus.READY ? '🍽️' :
           status === OrderStatus.SERVED ? '✅' :
           status === OrderStatus.CANCELLED ? '❌' : '⏳'}
        </div>
        <h2 className="text-[#ff6b35] mb-2">
          {status ? STATUS_LABELS[status] : '처리 중...'}
        </h2>
      </div>

      {/* 진행 단계 */}
      {status !== OrderStatus.CANCELLED && (
        <div className="flex justify-between mb-8 relative">
          <div className="absolute top-3 left-[10%] right-[10%] h-0.5 bg-gray-100" />
          {STATUS_STEPS.map((step, idx) => (
            <div key={step} className="flex flex-col items-center flex-1">
              <div className={`w-6 h-6 rounded-full z-10 border-2 ${idx <= currentStepIdx ? 'bg-[#ff6b35] border-[#ff6b35]' : 'bg-gray-100 border-gray-300'}`} />
              <span className={`text-[10px] mt-2 text-center ${idx <= currentStepIdx ? 'text-[#ff6b35]' : 'text-gray-400'}`}>
                {STATUS_LABELS[step].split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 주문 상세 */}
      {order && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-[15px] mb-3">주문 내역</h3>
          {order.items?.filter((i) => !i.cancelledAt).map((item) => (
            <div key={item.id} className="flex justify-between mb-2">
              <span className="text-sm">{item.menuItemName} ×{item.quantity}</span>
              <span className="text-sm">{item.totalPrice.toLocaleString()}원</span>
            </div>
          ))}
          <hr className="border-t border-gray-200 my-3" />
          {order.discountAmount > 0 && (
            <>
              <div className="flex justify-between mb-1 text-gray-500">
                <span>소계</span>
                <span>{order.totalAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between mb-2 text-red-500">
                <span>할인</span>
                <span>-{order.discountAmount.toLocaleString()}원</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-bold">
            <span>합계</span>
            <span>{order.finalAmount.toLocaleString()}원</span>
          </div>
        </div>
      )}

      {/* 메뉴로 이동 */}
      <button
        onClick={() => navigate('/menu', { replace: true })}
        className="block w-full mt-6 py-[14px] bg-[#ff6b35] text-white border-none rounded-xl text-base font-semibold cursor-pointer"
      >
        메뉴 더 주문하기
      </button>
    </div>
  );
}
