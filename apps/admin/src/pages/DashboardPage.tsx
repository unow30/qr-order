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

  return (
    <div>
      <h2 style={{ margin: '0 0 24px' }}>대시보드</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: '전체 주문', value: `${stats.total}건`, color: '#3f51b5' },
          { label: '대기 중', value: `${stats.pending}건`, color: '#ff9800' },
          { label: '조리 중', value: `${stats.preparing}건`, color: '#4caf50' },
          { label: '총 매출', value: `${stats.revenue.toLocaleString()}원`, color: '#ff6b35' },
        ].map((card) => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <p style={{ margin: '0 0 8px', color: '#888', fontSize: 14 }}>{card.label}</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 16px' }}>최근 주문</h3>
        {orders.slice(0, 10).map((order) => (
          <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div>
              <span style={{ fontWeight: 600 }}>{order.tableNumber}번 테이블</span>
              <span style={{ marginLeft: 12, color: '#888', fontSize: 13 }}>{order.items?.length}개 메뉴</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: '#ff6b35', fontWeight: 600 }}>{order.totalAmount.toLocaleString()}원</span>
              <span style={{ marginLeft: 12, color: '#888', fontSize: 12 }}>{order.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
