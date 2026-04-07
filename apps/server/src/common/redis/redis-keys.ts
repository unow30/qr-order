import { CartItem } from '@qr-order/shared-types';

// ─── Value 타입 정의 ────────────────────────────────────────────────────────

export interface SessionData {
  sessionToken: string;
  storeId: string;
  storeName: string;
  tableId: string;
  tableNumber: number;
  tableName: string;
  createdAt: string;
  expiresAt: string;
  pin: string;          // 6자리 PIN (테이블 공유용)
  joinedCount: number;  // 현재 참여 인원
  capacity: number;     // 테이블 최대 수용인원
}

// ─── 키 레지스트리 ──────────────────────────────────────────────────────────

/**
 * Redis 키 정의.
 * 각 항목은 key 빌더, value 타입, 기본 TTL(초)을 포함한다.
 *
 * 사용 예:
 *   const k = REDIS_KEYS.session.key(storeId, token);
 *   await redis.setex(k, REDIS_KEYS.session.ttl, JSON.stringify(data));
 */
export const REDIS_KEYS = {
  /** 고객 세션 — QR 스캔 후 생성되는 테이블 세션 */
  session: {
    key: (storeId: string, sessionToken: string) =>
      `session:${storeId}:${sessionToken}` as const,
    ttl: 7200, // 2시간
    _type: null as unknown as SessionData,
  },

  /** 세션 역조회 — sessionToken → storeId 매핑 */
  sessionLookup: {
    key: (sessionToken: string) =>
      `session-lookup:${sessionToken}` as const,
    ttl: 7200, // session과 동일
    _type: null as unknown as string, // storeId
  },

  /** 테이블→세션 매핑 — 테이블당 활성 세션 1개 제한 */
  tableSession: {
    key: (storeId: string, tableId: string) =>
      `table-session:${storeId}:${tableId}` as const,
    ttl: 7200, // session과 동일
    _type: null as unknown as string, // sessionToken
  },

  /** 장바구니 — 고객이 담은 메뉴 아이템 목록 */
  cart: {
    key: (storeId: string, sessionToken: string) =>
      `cart:${storeId}:${sessionToken}` as const,
    ttl: 7200, // 세션 TTL과 동기화
    _type: null as unknown as CartItem[],
  },

  /** 메뉴 캐시 — 매장별 전체 메뉴 트리 */
  menu: {
    key: (storeId: string) =>
      `menu:${storeId}:all` as const,
    ttl: 300, // 5분
  },

  /** 이미지 캐시 — 엔티티별 활성 이미지 목록 */
  image: {
    key: (entityType: string, entityId: string) =>
      `image:${entityType}:${entityId}:active` as const,
    ttl: 86400, // 24시간 (기본값, 이벤트 이미지 있으면 동적 조정)
  },
} as const;
