export interface CreateSessionDto {
  tableId: string;
  qrToken: string;
}

export interface SessionResponse {
  sessionToken: string;
  tableId: string;
  tableNumber: number;
  tableName: string;
  expiresAt: string;
}
