import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const STATUS_STEPS: { label: string; statuses: OrderStatus[] }[] = [
  { label: '주문', statuses: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
  { label: '조리', statuses: [OrderStatus.PREPARING] },
  { label: '서빙', statuses: [OrderStatus.READY, OrderStatus.SERVED] },
];

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrder, orderStatus, setOrder } = useOrderStore();
  useOrderSSE(id ?? null);

  useEffect(() => {
    if (!id) return;
    getOrder(id).then(setOrder).catch(() => {});
  }, [id]);

  const currentStepIdx = orderStatus
    ? STATUS_STEPS.findIndex((s) => s.statuses.includes(orderStatus))
    : 0;

  return (
    <div className="max-w-120 mx-auto p-6 font-sans">
      <h1 className="text-center text-xl mb-8">주문 현황</h1>

      {/* 상태 표시 */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">
          {orderStatus === OrderStatus.PREPARING ? '👨‍🍳' :
           orderStatus === OrderStatus.READY ? '🍽️' :
           orderStatus === OrderStatus.SERVED ? '✅' :
           orderStatus === OrderStatus.CANCELLED ? '❌' : '⏳'}
        </div>
        <h2 className="text-brand mb-2">
          {orderStatus ? STATUS_LABELS[orderStatus] : '처리 중...'}
        </h2>
      </div>

      {/* 진행 단계 */}
      {orderStatus !== OrderStatus.CANCELLED && (
        <div className="flex justify-between mb-8 relative">
          <div className="absolute top-3 left-[10%] right-[10%] h-0.5 bg-gray-100" />
          {STATUS_STEPS.map((step, idx) => (
            <div key={step.label} className="flex flex-col items-center flex-1">
              <div className={`w-6 h-6 rounded-full z-10 border-2 ${idx <= currentStepIdx ? 'bg-[#ff6b35] border-[#ff6b35]' : 'bg-gray-100 border-gray-300'}`} />
              <span className={`text-[10px] mt-2 text-center ${idx <= currentStepIdx ? 'text-brand' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 주문 상세 */}
      {currentOrder && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-[15px] mb-3">주문 내역</h3>
          {currentOrder.items?.map((item) => (
            <div key={item.id} className="flex justify-between mb-2">
              <span className="text-sm">{item.menuItemName} ×{item.quantity}</span>
              <span className="text-sm">{item.totalPrice.toLocaleString()}원</span>
            </div>
          ))}
          <hr className="border-t border-gray-200 my-3" />
          {currentOrder.discountAmount > 0 && (
            <>
              <div className="flex justify-between mb-1 text-gray-500">
                <span>소계</span>
                <span>{currentOrder.totalAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between mb-2 text-red-500">
                <span>할인</span>
                <span>-{currentOrder.discountAmount.toLocaleString()}원</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-bold">
            <span>합계</span>
            <span>{currentOrder.finalAmount.toLocaleString()}원</span>
          </div>
        </div>
      )}

      {/* 메뉴로 이동 */}
      <button
        onClick={() => navigate('/menu', { replace: true })}
        className="block w-full mt-6 py-[14px] bg-[#ff6b35] text-white border-none rounded-xl text-base font-semibold cursor-pointer"
      >
        🍽️ 메뉴 더 주문하기
      </button>
    </div>
  );
}
