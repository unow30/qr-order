export interface CreateSessionDto {
  tableId: string;
  qrToken: string;
}

export interface JoinSessionDto {
  tableId: string;
  qrToken: string;
  pin: string; // 6자리 숫자
}

export interface SessionResponse {
  sessionToken: string;
  tableId: string;
  tableNumber: number;
  tableName: string;
  expiresAt: string;
  pin?: string; // 세션 최초 생성자에게만 반환
}

export interface SessionConflictResponse {
  requirePin: true;
  tableId: string;
  tableName: string;
  tableNumber: number;
}
