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
    <div className="bg-white border border-[#e5e7eb] rounded-lg px-6 py-5">
      <p className="m-0 text-[13px] text-[#6b7280]">{label}</p>
      <p className="mt-2 mb-0 text-2xl font-bold text-[#111827]">{value}</p>
    </div>
  );
}

function StoreRow({ store }: { store: StoreReportSummary }) {
  return (
    <tr className="border-b border-[#f3f4f6]">
      <td className="px-4 py-3 text-sm font-medium">{store.storeName}</td>
      <td className="px-4 py-3 text-sm text-right">{store.totalOrders.toLocaleString()}</td>
      <td className="px-4 py-3 text-sm text-right text-[#059669]">
        {formatKRW(store.totalRevenue)}
      </td>
      <td className="px-4 py-3 text-sm text-right text-[#f59e0b]">
        {store.pendingOrders}
      </td>
      <td className="px-4 py-3 text-sm text-right text-[#3b82f6]">
        {store.completedOrders}
      </td>
      <td className="px-4 py-3 text-sm text-right text-[#ef4444]">
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
    <div className="flex items-center gap-3 py-2 border-b border-[#f9fafb]">
      <span className="w-5 text-[13px] text-[#6b7280] text-right shrink-0">{rank}</span>
      <span className="flex-1 text-sm font-medium min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
        {item.menuItemName}
      </span>
      <div className="w-[140px] h-2 bg-[#f3f4f6] rounded shrink-0">
        {/* width는 동적이므로 인라인 style 유지 (Tailwind 동적 클래스 불가) */}
        <div style={{ width: `${pct}%` }} className="h-full bg-blue-600 rounded transition-[width] duration-300" />
      </div>
      <span className="text-[13px] font-semibold text-[#111827] w-[90px] text-right shrink-0">
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
    <div className="p-6">
      <h2 className="mt-0 mb-5 text-xl font-bold">매출/주문 리포트</h2>

      {/* 탭 */}
      <div className="flex gap-1 mb-5 border-b-2 border-[#e5e7eb]">
        {([
          { key: 'sales', label: '📊 매출 현황' },
          { key: 'menu', label: '🍽 메뉴 분석' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2 text-sm border-none bg-transparent cursor-pointer -mb-0.5 border-b-2 ${
              tab === key
                ? 'font-semibold border-[#2563eb] text-[#2563eb]'
                : 'font-normal border-transparent text-[#6b7280]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 날짜 필터 + 조회 버튼 */}
      <div className="flex gap-3 items-end mb-6">
        <label className="text-[13px]">
          시작일
          <input
            type="date"
            value={query.startDate ?? ''}
            onChange={(e) => handleQueryChange('startDate', e.target.value)}
            className="block mt-1 px-2.5 py-1.5 border border-[#d1d5db] rounded-md"
          />
        </label>
        <label className="text-[13px]">
          종료일
          <input
            type="date"
            value={query.endDate ?? ''}
            onChange={(e) => handleQueryChange('endDate', e.target.value)}
            className="block mt-1 px-2.5 py-1.5 border border-[#d1d5db] rounded-md"
          />
        </label>
        <button
          onClick={loadReport}
          disabled={loading}
          className={`px-5 py-[7px] bg-[#2563eb] text-white border-none rounded-md text-[13px] ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          조회
        </button>
      </div>

      {error && (
        <div className="p-3 bg-[#fee2e2] text-[#dc2626] rounded-md mb-4">
          {error}
        </div>
      )}

      {loading && <p className="text-[#6b7280]">불러오는 중...</p>}

      {/* ===== 탭: 매출 현황 ===== */}
      {tab === 'sales' && !loading && (
        <>
          {/* SUPER_ADMIN: 전체 통계 */}
          {isSuperAdmin() && overall && (
            <>
              <p className="text-xs text-[#9ca3af] mb-4">
                기간: {new Date(overall.periodStart).toLocaleDateString('ko-KR')} ~{' '}
                {new Date(overall.periodEnd).toLocaleDateString('ko-KR')}
              </p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                <StatCard label="총 매장 수" value={overall.totalStores} />
                <StatCard label="총 주문 수" value={overall.totalOrders.toLocaleString()} />
                <StatCard label="총 매출" value={formatKRW(overall.totalRevenue)} />
              </div>
              <h3 className="m-0 mb-3 text-base font-semibold">매장별 현황</h3>
              <div className="bg-white border border-[#e5e7eb] rounded-lg overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                      {['매장명', '총 주문', '매출', '처리중', '완료', '취소'].map((h) => (
                        <th
                          key={h}
                          className={`px-4 py-2.5 text-xs font-semibold text-[#6b7280] ${h === '매장명' ? 'text-left' : 'text-right'}`}
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
              <h3 className="m-0 mb-4 text-base font-semibold">{storeSummary.storeName}</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
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
          <p className="text-xs text-[#9ca3af] mb-5">
            기간: {new Date(menuAnalytics.periodStart).toLocaleDateString('ko-KR')} ~{' '}
            {new Date(menuAnalytics.periodEnd).toLocaleDateString('ko-KR')}
          </p>

          {menuAnalytics.topItems.length === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center text-[#9ca3af]">
              해당 기간 주문 데이터가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {/* 판매량 TOP 10 */}
              <div className="bg-white border border-[#e5e7eb] rounded-xl px-6 py-5">
                <h3 className="m-0 mb-4 text-[15px] font-semibold">🏆 판매량 TOP 10</h3>
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
              <div className="bg-white border border-[#e5e7eb] rounded-xl px-6 py-5">
                <h3 className="m-0 mb-4 text-[15px] font-semibold">💰 매출 TOP 10</h3>
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
