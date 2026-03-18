import { useEffect, useState } from 'react';
import { getOrders } from '../api/order.api';
import { Order, OrderStatus } from '@qr-order/shared-types';

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    getOrders().then(setOrders).catch(console.error);
  }, []);

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === OrderStatus.PENDING).length,
    preparing: orders.filter((o) => o.status === OrderStatus.PREPARING).length,
    revenue: orders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce((s, o) => s + o.totalAmount, 0),
  };

  const cardColors: Record<string, string> = {
    '전체 주문': 'text-indigo-600',
    '대기 중': 'text-orange-500',
    '조리 중': 'text-green-600',
    '총 매출': 'text-brand',
  };

  return (
    <div>
      <h2 className="mb-6">대시보드</h2>
      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {[
          { label: '전체 주문', value: `${stats.total}건` },
          { label: '대기 중', value: `${stats.pending}건` },
          { label: '조리 중', value: `${stats.preparing}건` },
          { label: '총 매출', value: `${stats.revenue.toLocaleString()}원` },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <p className="mb-2 text-gray-400 text-sm">{card.label}</p>
            <p className={`m-0 text-[28px] font-bold ${cardColors[card.label]}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <h3 className="mb-4">최근 주문</h3>
        {orders.slice(0, 10).map((order) => (
          <div key={order.id} className="flex justify-between py-3 border-b border-gray-100">
            <div>
              <span className="font-semibold">{order.tableNumber}번 테이블</span>
              <span className="ml-3 text-gray-400 text-[13px]">{order.items?.length}개 메뉴</span>
            </div>
            <div className="text-right">
              <span className="text-brand font-semibold">{order.totalAmount.toLocaleString()}원</span>
              <span className="ml-3 text-gray-400 text-xs">{order.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
