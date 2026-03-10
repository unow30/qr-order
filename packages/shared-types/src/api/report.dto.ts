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

export interface ReportQueryDto {
  startDate?: string; // ISO 날짜 문자열
  endDate?: string;
}
