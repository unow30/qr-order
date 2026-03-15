import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  getOverallSummary,
  getStoreSummary,
  getMenuAnalytics,
  OverallReportSummary,
  StoreReportSummary,
  ReportQuery,
  MenuAnalyticsResult,
  MenuItemStat,
} from '../api/report.api';

type Tab = 'sales' | 'menu';

function formatKRW(amount: number) {
  return amount.toLocaleString('ko-KR') + '원';
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '20px 24px' }}>
      <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{label}</p>
      <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 700, color: '#111827' }}>{value}</p>
    </div>
  );
}

function StoreRow({ store }: { store: StoreReportSummary }) {
  return (
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
      <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500 }}>{store.storeName}</td>
      <td style={{ padding: '12px 16px', fontSize: 14, textAlign: 'right' }}>{store.totalOrders.toLocaleString()}</td>
      <td style={{ padding: '12px 16px', fontSize: 14, textAlign: 'right', color: '#059669' }}>
        {formatKRW(store.totalRevenue)}
      </td>
      <td style={{ padding: '12px 16px', fontSize: 14, textAlign: 'right', color: '#f59e0b' }}>
        {store.pendingOrders}
      </td>
      <td style={{ padding: '12px 16px', fontSize: 14, textAlign: 'right', color: '#3b82f6' }}>
        {store.completedOrders}
      </td>
      <td style={{ padding: '12px 16px', fontSize: 14, textAlign: 'right', color: '#ef4444' }}>
        {store.cancelledOrders}
      </td>
    </tr>
  );
}

/** F12: 메뉴 분석 — 가로 바 차트 행 */
function MenuStatRow({
  rank,
  item,
  maxValue,
  valueKey,
}: {
  rank: number;
  item: MenuItemStat;
  maxValue: number;
  valueKey: 'totalQuantity' | 'totalRevenue';
}) {
  const value = item[valueKey];
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f9fafb' }}>
      <span style={{ width: 20, fontSize: 13, color: '#6b7280', textAlign: 'right', flexShrink: 0 }}>{rank}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.menuItemName}
      </span>
      <div style={{ width: 140, height: 8, background: '#f3f4f6', borderRadius: 4, flexShrink: 0 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#2563eb', borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', width: 90, textAlign: 'right', flexShrink: 0 }}>
        {valueKey === 'totalRevenue' ? formatKRW(value) : `${value.toLocaleString()}개`}
      </span>
    </div>
  );
}

export default function ReportPage() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const currentStoreId = useAuthStore((s) => s.currentStoreId);

  const [tab, setTab] = useState<Tab>('sales');
  const [overall, setOverall] = useState<OverallReportSummary | null>(null);
  const [storeSummary, setStoreSummary] = useState<StoreReportSummary | null>(null);
  const [menuAnalytics, setMenuAnalytics] = useState<MenuAnalyticsResult | null>(null);
  const [query, setQuery] = useState<ReportQuery>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSalesReport = async () => {
    if (isSuperAdmin()) {
      const data = await getOverallSummary(query);
      setOverall(data);
    } else if (currentStoreId) {
      const data = await getStoreSummary(currentStoreId, query);
      setStoreSummary(data);
    }
  };

  const loadMenuAnalytics = async () => {
    const data = await getMenuAnalytics(
      currentStoreId && !isSuperAdmin() ? { ...query, storeId: currentStoreId } : query,
    );
    setMenuAnalytics(data);
  };

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'sales') {
        await loadSalesReport();
      } else {
        await loadMenuAnalytics();
      }
    } catch {
      setError('리포트를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [tab]);

  const handleQueryChange = (field: keyof ReportQuery, value: string) => {
    setQuery((prev) => ({ ...prev, [field]: value || undefined }));
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>매출/주문 리포트</h2>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        {([
          { key: 'sales', label: '📊 매출 현황' },
          { key: 'menu', label: '🍽 메뉴 분석' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '8px 20px',
              fontSize: 14,
              fontWeight: tab === key ? 600 : 400,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: tab === key ? '2px solid #2563eb' : '2px solid transparent',
              color: tab === key ? '#2563eb' : '#6b7280',
              marginBottom: -2,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 날짜 필터 + 조회 버튼 */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 24 }}>
        <label style={{ fontSize: 13 }}>
          시작일
          <input
            type="date"
            value={query.startDate ?? ''}
            onChange={(e) => handleQueryChange('startDate', e.target.value)}
            style={{ display: 'block', marginTop: 4, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6 }}
          />
        </label>
        <label style={{ fontSize: 13 }}>
          종료일
          <input
            type="date"
            value={query.endDate ?? ''}
            onChange={(e) => handleQueryChange('endDate', e.target.value)}
            style={{ display: 'block', marginTop: 4, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6 }}
          />
        </label>
        <button
          onClick={loadReport}
          disabled={loading}
          style={{
            padding: '7px 20px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 13,
            opacity: loading ? 0.6 : 1,
          }}
        >
          조회
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && <p style={{ color: '#6b7280' }}>불러오는 중...</p>}

      {/* ===== 탭: 매출 현황 ===== */}
      {tab === 'sales' && !loading && (
        <>
          {/* SUPER_ADMIN: 전체 통계 */}
          {isSuperAdmin() && overall && (
            <>
              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
                기간: {new Date(overall.periodStart).toLocaleDateString('ko-KR')} ~{' '}
                {new Date(overall.periodEnd).toLocaleDateString('ko-KR')}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                <StatCard label="총 매장 수" value={overall.totalStores} />
                <StatCard label="총 주문 수" value={overall.totalOrders.toLocaleString()} />
                <StatCard label="총 매출" value={formatKRW(overall.totalRevenue)} />
              </div>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>매장별 현황</h3>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      {['매장명', '총 주문', '매출', '처리중', '완료', '취소'].map((h) => (
                        <th
                          key={h}
                          style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textAlign: h === '매장명' ? 'left' : 'right' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overall.stores.map((store) => (
                      <StoreRow key={store.storeId} store={store} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* STORE_ADMIN: 본인 매장 통계 */}
          {!isSuperAdmin() && storeSummary && (
            <>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>{storeSummary.storeName}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
                <StatCard label="총 주문 수" value={storeSummary.totalOrders.toLocaleString()} />
                <StatCard label="총 매출" value={formatKRW(storeSummary.totalRevenue)} />
                <StatCard label="처리중 주문" value={storeSummary.pendingOrders} />
                <StatCard label="완료된 주문" value={storeSummary.completedOrders} />
              </div>
            </>
          )}
        </>
      )}

      {/* ===== 탭: 메뉴 분석 (F12) ===== */}
      {tab === 'menu' && !loading && menuAnalytics && (
        <>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>
            기간: {new Date(menuAnalytics.periodStart).toLocaleDateString('ko-KR')} ~{' '}
            {new Date(menuAnalytics.periodEnd).toLocaleDateString('ko-KR')}
          </p>

          {menuAnalytics.topItems.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              해당 기간 주문 데이터가 없습니다.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* 판매량 TOP 10 */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>🏆 판매량 TOP 10</h3>
                {menuAnalytics.topItems.map((item, i) => (
                  <MenuStatRow
                    key={item.menuItemId}
                    rank={i + 1}
                    item={item}
                    maxValue={menuAnalytics.topItems[0].totalQuantity}
                    valueKey="totalQuantity"
                  />
                ))}
              </div>

              {/* 매출 TOP 10 */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>💰 매출 TOP 10</h3>
                {menuAnalytics.topRevenueItems.map((item, i) => (
                  <MenuStatRow
                    key={item.menuItemId}
                    rank={i + 1}
                    item={item}
                    maxValue={menuAnalytics.topRevenueItems[0].totalRevenue}
                    valueKey="totalRevenue"
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
