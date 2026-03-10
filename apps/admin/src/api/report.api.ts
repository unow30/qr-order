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

export const getOverallSummary = (query?: ReportQuery): Promise<OverallReportSummary> => {
  const params = new URLSearchParams();
  if (query?.startDate) params.set('startDate', query.startDate);
  if (query?.endDate) params.set('endDate', query.endDate);
  const qs = params.toString();
  return client.get(`/reports/summary${qs ? `?${qs}` : ''}`);
};

export const getStoreSummary = (storeId: string, query?: ReportQuery): Promise<StoreReportSummary> => {
  const params = new URLSearchParams();
  if (query?.startDate) params.set('startDate', query.startDate);
  if (query?.endDate) params.set('endDate', query.endDate);
  const qs = params.toString();
  return client.get(`/reports/stores/${storeId}${qs ? `?${qs}` : ''}`);
};
