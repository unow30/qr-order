import client from './client';

export interface StoreReportSummary {
  storeId: string;
  storeName: string;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

export interface OverallReportSummary {
  totalStores: number;
  totalOrders: number;
  totalRevenue: number;
  stores: StoreReportSummary[];
  periodStart: string;
  periodEnd: string;
}

export interface ReportQuery {
  startDate?: string;
  endDate?: string;
}

export interface MenuItemStat {
  menuItemId: string;
  menuItemName: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

export interface MenuAnalyticsResult {
  storeId: string;
  periodStart: string;
  periodEnd: string;
  topItems: MenuItemStat[];
  topRevenueItems: MenuItemStat[];
}

const buildQs = (query?: ReportQuery & { storeId?: string }) => {
  const params = new URLSearchParams();
  if (query?.startDate) params.set('startDate', query.startDate);
  if (query?.endDate) params.set('endDate', query.endDate);
  if (query?.storeId) params.set('storeId', query.storeId);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const getOverallSummary = (query?: ReportQuery): Promise<OverallReportSummary> =>
  client.get(`/reports/summary${buildQs(query)}`);

export const getStoreSummary = (storeId: string, query?: ReportQuery): Promise<StoreReportSummary> =>
  client.get(`/reports/stores/${storeId}${buildQs(query)}`);

/** F12: 메뉴별 판매 분석 */
export const getMenuAnalytics = (query?: ReportQuery & { storeId?: string }): Promise<MenuAnalyticsResult> =>
  client.get(`/reports/menu-analytics${buildQs(query)}`);
