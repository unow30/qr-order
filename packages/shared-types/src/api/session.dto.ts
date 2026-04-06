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

// ─── 자리이동 ────────────────────────────────────────────────────────

export interface MoveSessionDto {
  qrToken: string; // 이동할 테이블의 QR 토큰 (물리적 위치 증명)
}

export interface MoveSessionResponse {
  sessionToken: string;
  tableId: string;
  tableNumber: number;
  tableName: string;
  expiresAt: string;
}

// ─── 관리자 세션 관리 ────────────────────────────────────────────────

export interface TableSessionInfo {
  sessionToken: string;
  pin: string;
  joinedCount: number;
  capacity: number;
  tableId: string;
  tableName: string;
  tableNumber: number;
  createdAt: string;
  expiresAt: string;
}

export interface AdminMoveSessionDto {
  targetTableId: string;
}

export interface ForceDeleteSessionResponse {
  deleted: true;
  sessionToken: string;
}
