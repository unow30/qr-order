import client from '@admin/api/client';
import {
  Table,
  CreateTableDto,
  TableSessionInfo,
  ForceDeleteSessionResponse,
} from '@qr-order/shared-types';

export const getTables = (): Promise<Table[]> => client.get('/tables');
export const getTablesWithTokens = (): Promise<
  { table: Table; token: string | null; expiresAt: string | null; isActive: boolean }[]
> => client.get('/tables/with-tokens');
export const createTable = (dto: CreateTableDto): Promise<Table> => client.post('/tables', dto);
export const deleteTable = (id: string): Promise<void> => client.delete(`/tables/${id}`);
export const generateQrToken = (id: string): Promise<{ token: string }> => client.post(`/tables/${id}/qr`);
export const getQrToken = (id: string): Promise<{ token: string }> => client.get(`/tables/${id}/qr`);

// ─── 세션 관리 ──────────────────────────────────────────────────────
export const getTableSession = (tableId: string): Promise<TableSessionInfo | null> =>
  client.get(`/sessions/admin/tables/${tableId}`);

export const adminMoveSession = (
  tableId: string,
  targetTableId: string,
): Promise<TableSessionInfo> =>
  client.post(`/sessions/admin/tables/${tableId}/move`, { targetTableId });

export const deleteTableSession = (
  tableId: string,
): Promise<ForceDeleteSessionResponse> =>
  client.delete(`/sessions/admin/tables/${tableId}`);
