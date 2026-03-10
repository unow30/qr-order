import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  getOverallSummary,
  getStoreSummary,
  OverallReportSummary,
  StoreReportSummary,
  ReportQuery,
} from '../api/report.api';

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

export default function ReportPage() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const storeId = useAuthStore((s) => s.storeId);

  const [overall, setOverall] = useState<OverallReportSummary | null>(null);
  const [storeSummary, setStoreSummary] = useState<StoreReportSummary | null>(null);
  const [query, setQuery] = useState<ReportQuery>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSuperAdmin()) {
        const data = await getOverallSummary(query);
        setOverall(data);
      } else if (storeId) {
        const data = await getStoreSummary(storeId, query);
        setStoreSummary(data);
      }
    } catch {
      setError('리포트를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleQueryChange = (field: keyof ReportQuery, value: string) => {
    setQuery((prev) => ({ ...prev, [field]: value || undefined }));
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 700 }}>매출/주문 리포트</h2>

      {/* 날짜 필터 */}
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

      {/* SUPER_ADMIN: 전체 통계 */}
      {!loading && isSuperAdmin() && overall && (
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
      {!loading && !isSuperAdmin() && storeSummary && (
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
    </div>
  );
}
