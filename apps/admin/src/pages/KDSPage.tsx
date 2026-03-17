import { useCallback, useEffect, useState } from 'react';
import { getOrders, updateOrderStatus } from '../api/order.api';
import { Order, OrderStatus } from '@qr-order/shared-types';
import { useAuthStore } from '../stores/authStore';
import { useStoreNames } from '../hooks/useStoreNames';
import { useOrdersSSE } from '../hooks/useOrdersSSE';

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const { currentStoreId, isSuperAdmin } = useAuthStore();
  const superAdmin = isSuperAdmin();
  const isAllStores = superAdmin && !currentStoreId;
  const storeNameMap = useStoreNames();

  const fetchOrders = useCallback(() =>
    getOrders().then((all) =>
      setOrders(
        all
          .filter((o) => o.status === OrderStatus.CONFIRMED || o.status === OrderStatus.PREPARING)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      ),
    ), []);

  useEffect(() => {
    fetchOrders();
  }, [currentStoreId, fetchOrders]);

  useOrdersSSE(fetchOrders);

  const handleStartPreparing = async (id: string) => {
    await updateOrderStatus(id, { status: OrderStatus.PREPARING });
    fetchOrders();
  };

  const handleReady = async (id: string) => {
    await updateOrderStatus(id, { status: OrderStatus.READY });
    fetchOrders();
  };

  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="m-0">주방 디스플레이 (KDS)</h2>
          {superAdmin && (
            <span className={`px-3 py-1 rounded-full text-[13px] font-semibold ${
              isAllStores ? 'bg-[#e8f5e9] text-[#1b5e20]' : 'bg-[#e3f2fd] text-[#0d47a1]'
            }`}>
              {isAllStores ? '전체 매장' : (storeNameMap[currentStoreId!] || '선택된 매장')}
            </span>
          )}
        </div>
        <span className="text-[13px] text-[#888]">실시간 업데이트</span>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {orders.map((order) => {
          const headerBorderCls = order.status === OrderStatus.PREPARING
            ? 'border-b-[3px] border-green-500'
            : 'border-b-[3px] border-orange-400';
          const badgeCls = order.status === OrderStatus.PREPARING
            ? 'bg-green-50 text-green-800'
            : 'bg-orange-50 text-orange-700';

          return (
            <div
              key={order.id}
              className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col"
            >
              {/* 헤더 */}
              <div className={`px-5 py-3.5 flex justify-between items-center ${headerBorderCls}`}>
                <div>
                  <h3 className="m-0 text-xl font-bold">{order.tableNumber}번 테이블</h3>
                  {isAllStores && order.storeId && storeNameMap[order.storeId] && (
                    <span className="text-xs text-[#888] mt-0.5 block">
                      🏪 {storeNameMap[order.storeId]}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-1 ${badgeCls}`}>
                    {order.status === OrderStatus.PREPARING ? '조리 중' : '대기'}
                  </span>
                  <div className="text-xs text-[#aaa]">
                    {new Date(order.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="px-5 py-3 border-b border-[#f0f0f0]">
                {order.status === OrderStatus.CONFIRMED && (
                  <button
                    onClick={() => handleStartPreparing(order.id)}
                    className="w-full py-2.5 bg-green-500 text-white border-none rounded-lg cursor-pointer text-sm font-semibold tracking-wide"
                  >
                    🍳 조리 시작
                  </button>
                )}
                {order.status === OrderStatus.PREPARING && (
                  <button
                    onClick={() => handleReady(order.id)}
                    className="w-full py-2.5 bg-[#3f51b5] text-white border-none rounded-lg cursor-pointer text-sm font-semibold tracking-wide"
                  >
                    🍽️ 서빙 준비 완료
                  </button>
                )}
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
        {orders.length === 0 && (
          <div className="col-span-full text-center py-20 text-[#888]">
            <div className="text-5xl mb-4">✅</div>
            <p>현재 조리 중인 주문이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
