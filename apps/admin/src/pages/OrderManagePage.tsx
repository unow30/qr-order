import { useCallback, useEffect, useState } from 'react';
import { getOrders, updateOrderStatus } from '@admin/api/order.api';
import { processAdminPayment } from '@admin/api/payment.api';
import { Order, OrderStatus, PaymentMethod } from '@qr-order/shared-types';
import { useAuthStore } from '@admin/stores/authStore';
import { useStoreNames } from '@admin/hooks/useStoreNames';
import { useOrdersSSE } from '@admin/hooks/useOrdersSSE';

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '접수 대기',
  [OrderStatus.CONFIRMED]: '주문 확인',
  [OrderStatus.PREPARING]: '조리 중',
  [OrderStatus.READY]: '서빙 준비',
  [OrderStatus.SERVED]: '서빙 완료',
  [OrderStatus.CANCELLED]: '취소됨',
};

const STATUS_CLASSES: Record<OrderStatus, { borderB: string; badge: string }> = {
  [OrderStatus.PENDING]:   { borderB: 'border-b-[3px] border-orange-400', badge: 'bg-orange-50 text-orange-700' },
  [OrderStatus.CONFIRMED]: { borderB: 'border-b-[3px] border-blue-400',   badge: 'bg-blue-50 text-blue-800' },
  [OrderStatus.PREPARING]: { borderB: 'border-b-[3px] border-green-500',  badge: 'bg-green-50 text-green-800' },
  [OrderStatus.READY]:     { borderB: 'border-b-[3px] border-purple-400', badge: 'bg-purple-50 text-purple-800' },
  [OrderStatus.SERVED]:    { borderB: 'border-b-[3px] border-gray-400',   badge: 'bg-gray-100 text-gray-600' },
  [OrderStatus.CANCELLED]: { borderB: 'border-b-[3px] border-red-500',    badge: 'bg-red-50 text-red-800' },
};

// CONFIRMED·PREPARING 상태는 주방(KDS)에서 제어하므로 주문관리에서 버튼 미노출
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.PENDING]: OrderStatus.CONFIRMED,
  [OrderStatus.READY]: OrderStatus.SERVED,
};


export default function OrderManagePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const { currentStoreId, isSuperAdmin } = useAuthStore();
  const superAdmin = isSuperAdmin();
  const isAllStores = superAdmin && !currentStoreId;
  const storeNameMap = useStoreNames();

  const fetchOrders = useCallback(() => {
    setLoading(true);
    getOrders().then(setOrders).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [currentStoreId, fetchOrders]);

  useOrdersSSE(fetchOrders);

  const handleStatusChange = async (order: Order, status: OrderStatus) => {
    await updateOrderStatus(order.id, { status });
    fetchOrders();
  };

  const handlePayment = async (order: Order, method: PaymentMethod) => {
    setPayingOrderId(order.id);
    try {
      await processAdminPayment(order.id, method);
      fetchOrders();
    } catch {
      alert('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setPayingOrderId(null);
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await updateOrderStatus(cancelTarget.id, { status: OrderStatus.CANCELLED });
      fetchOrders();
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  const activeOrders = orders
    .filter((o) => o.status !== OrderStatus.CANCELLED && !(o.status === OrderStatus.SERVED && o.isPaid))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (loading) return <div>주문 목록 불러오는 중...</div>;

  return (
    <div>
      {/* 취소 확인 모달 */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-2xl p-7 w-80 shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
            <h3 className="m-0 mb-2 text-lg">주문을 취소하시겠습니까?</h3>
            <p className="m-0 mb-4 text-sm text-[#666]">
              {cancelTarget.tableNumber}번 테이블 · {cancelTarget.items?.length ?? 0}개 메뉴
            </p>
            <div className="bg-[#f8f8f8] rounded-lg px-3.5 py-2.5 mb-5">
              {cancelTarget.items?.map((item) => (
                <div key={item.id} className="text-[13px] text-[#444] mb-1">
                  {item.menuItemName} ×{item.quantity}
                </div>
              ))}
            </div>
            <p className="m-0 mb-5 text-[13px] text-[#e53935] font-semibold">
              ⚠️ 취소 후에는 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="flex-1 py-2.5 bg-[#f5f5f5] text-[#333] border-none rounded-lg cursor-pointer text-sm"
              >
                돌아가기
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelling}
                className={`flex-1 py-2.5 bg-[#e53935] text-white border-none rounded-lg text-sm font-semibold ${cancelling ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {cancelling ? '취소 중...' : '주문 취소'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <h2 className="m-0">주문 관리</h2>
        {superAdmin && (
          <span className={`px-3 py-1 rounded-full text-[13px] font-semibold ${
            isAllStores ? 'bg-[#e8f5e9] text-[#1b5e20]' : 'bg-[#e3f2fd] text-[#0d47a1]'
          }`}>
            {isAllStores ? '전체 매장' : (storeNameMap[currentStoreId!] || '선택된 매장')}
          </span>
        )}
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {activeOrders.map((order) => {
          const cls = STATUS_CLASSES[order.status];
          const nextStatus = NEXT_STATUS[order.status];
          return (
            <div
              key={order.id}
              className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col"
            >
              {/* 헤더 */}
              <div className={`px-5 py-3.5 flex justify-between items-center ${cls.borderB}`}>
                <div>
                  <h3 className="m-0 text-xl font-bold">{order.tableNumber}번 테이블</h3>
                  {isAllStores && order.storeId && storeNameMap[order.storeId] && (
                    <span className="text-xs text-[#888] mt-0.5 block">
                      🏪 {storeNameMap[order.storeId]}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-1 ${cls.badge}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                  <div className="text-xs text-[#aaa]">
                    {new Date(order.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="px-5 py-3 border-b border-[#f0f0f0] flex flex-col gap-2">
                {nextStatus && (
                  <button
                    onClick={() => handleStatusChange(order, nextStatus)}
                    className="w-full py-2.5 bg-[#ff6b35] text-white border-none rounded-lg cursor-pointer text-sm font-semibold tracking-wide"
                  >
                    {STATUS_LABELS[nextStatus]} →
                  </button>
                )}
                {order.status === OrderStatus.SERVED && !order.isPaid && (
                  <button
                    onClick={() => handlePayment(order, PaymentMethod.CARD)}
                    disabled={payingOrderId === order.id}
                    className={`w-full py-2.5 bg-[#1565c0] text-white border-none rounded-lg text-sm font-semibold ${payingOrderId === order.id ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {payingOrderId === order.id ? '처리 중...' : '결제하기'}
                  </button>
                )}
                <button
                  onClick={() => setCancelTarget(order)}
                  className="w-full py-2 bg-white text-[#e53935] border border-[#e53935] rounded-lg cursor-pointer text-[13px]"
                >
                  주문 취소
                </button>
              </div>

              {/* 주문 항목 */}
              <div className="px-5 py-3 flex-1">
                {order.items?.map((item) => (
                  <div key={item.id} className="py-2 border-b border-[#f5f5f5]">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[15px]">{item.menuItemName}</span>
                      <span className="text-lg font-bold text-brand">×{item.quantity}</span>
                    </div>
                    {item.selectedOptions?.length > 0 && (
                      <div className="mt-1">
                        {item.selectedOptions.map((opt) => (
                          <span key={opt.optionId} className="text-xs text-[#888] mr-2">
                            {opt.optionName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 요청사항 */}
              {order.note && (
                <div className="px-5 py-2.5 bg-[#fffde7] border-t border-[#f0f0f0]">
                  <p className="m-0 text-[13px] text-[#555]">📝 {order.note}</p>
                </div>
              )}
            </div>
          );
        })}
        {activeOrders.length === 0 && (
          <div className="col-span-full text-center py-12 text-[#888]">
            현재 처리 중인 주문이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
