# 세션 생명주기 (Session Lifecycle)

QR 오더 서비스에서 "세션"은 고객이 QR 코드를 스캔한 순간부터 결제 완료(또는 명시적 종료)까지 테이블 점유를 추적하는 단위다.  
모든 세션 데이터는 **Redis에만** 저장되며, TTL이 만료되면 자동 소멸한다.

---

## Redis 키 구조

| 키 패턴 | 값 타입 | TTL | 역할 |
|---|---|---|---|
| `session:{storeId}:{sessionToken}` | `SessionData` (JSON) | 2시간 | 세션 본체 |
| `session-lookup:{sessionToken}` | `storeId` (string) | 2시간 | sessionToken → storeId 역조회 |
| `table-session:{storeId}:{tableId}` | `sessionToken` (string) | 2시간 | 테이블당 활성 세션 1개 제한 |
| `cart:{storeId}:{sessionToken}` | `CartItem[]` (JSON) | 세션과 동기화 | 장바구니 |

### SessionData 필드

```ts
interface SessionData {
  sessionToken: string;   // UUID v4
  storeId: string;
  storeName: string;
  tableId: string;
  tableNumber: number;
  tableName: string;
  createdAt: string;      // ISO 8601
  expiresAt: string;      // ISO 8601
  pin: string;            // 6자리 숫자 (동행자 공유용)
  joinedCount: number;    // 현재 참여 인원
  capacity: number;       // 테이블 최대 수용인원
}
```

---

## 전체 흐름 다이어그램

```
고객 QR 스캔
    │
    ▼
[1] POST /sessions  ──────────────── createSession()
    │  QR 토큰 검증 (TableEntity.qrToken)
    │  table-session SET NX (원자적, 중복 방지)
    │    ├─ 실패(이미 활성 세션 있음) → 409 ConflictException { requirePin: true }
    │    └─ 성공 → session / session-lookup / table-session 저장
    │
    │ 동행자가 있으면 ─────────────────────────────────────────────
    ▼
[2] POST /sessions/join  ──────────── joinSession()
    │  QR 토큰 + PIN 검증
    │  joinedCount++ (잔여 TTL 유지)
    │
    │ 자리 이동이 필요하면 ────────────────────────────────────────
    ▼
[3] POST /sessions/move  ──────────── moveSession()
    │  현재 세션 검증
    │  새 테이블 QR 토큰 검증
    │  새 테이블 활성 세션 없음 확인
    │  수용인원 확인
    │  old table-session 삭제 + new table-session 생성 + SessionData 갱신
    │
    ├─ (장바구니 조작 반복) ──────────────────────────────────────
    │    PUT  /cart/items     → renewSession() 호출 (TTL 갱신)
    │    DELETE /cart/items/:id
    │
    ├─ (주문 생성) ───────────────────────────────────────────────
    ▼
[4] POST /orders  ─────────────────── createOrder()
    │  세션 검증 → 장바구니 → Order + OrderItem DB 저장
    │  clearCart() (cart 키 삭제)
    │  세션은 유지됨 (추가 주문 가능)
    │
    ├─ (결제 시작)
    ▼
[5] POST /payments  ───────────────── createPayment()
    │  주문 금액 검증
    │  Payment(PENDING) 생성
    │
    ▼
[5'] POST /payments/confirm  ───────── confirmPayment()
    │  트랜잭션: Payment → COMPLETED, Order → CONFIRMED
    │  SSE 이벤트 발행
    │  deleteSession() ← 결제 완료 시 세션 자동 삭제
    │
    ▼
[종료 A] 정상 종료 (결제 완료)
    deleteSession(sessionToken)
      ├─ session:{storeId}:{sessionToken}  DEL
      ├─ session-lookup:{sessionToken}     DEL
      ├─ cart:{storeId}:{sessionToken}     DEL
      └─ table-session:{storeId}:{tableId} DEL

[종료 B] 고객 직접 종료
    DELETE /sessions  (x-session-token 헤더)
      └─ 동일하게 4개 키 삭제

[종료 C] 관리자 강제 종료
    DELETE /sessions/admin/tables/:tableId
      └─ 동일하게 4개 키 삭제

[종료 D] TTL 만료 (2시간 무활동)
      └─ Redis가 자동으로 모든 키 삭제
```

---

## 단계별 상세 설명

### [1] 세션 생성 — `POST /sessions`

**요청:** `{ qrToken: string }`

1. `TableService.validateQrToken(qrToken)` → DB에서 테이블 조회  
2. `SET table-session:{storeId}:{tableId} {sessionToken} EX 7200 NX` 실행  
   - **NX 플래그**: 이미 키가 있으면 쓰기 거부 → 테이블당 세션 1개 보장  
   - 실패 시 `409 ConflictException { requirePin: true }` 반환 → 클라이언트는 PIN 입력 UI로 전환  
3. 6자리 PIN 생성 (100000~999999 난수)  
4. `session:{storeId}:{sessionToken}` 과 `session-lookup:{sessionToken}` 을 동시에 저장  
5. 생성자에게 `sessionToken` + `pin` 반환

**응답:** `{ sessionToken, tableId, tableNumber, tableName, storeId, storeName, expiresAt, pin }`

---

### [2] 세션 참여 — `POST /sessions/join`

**요청:** `{ qrToken: string, pin: string }`

1. QR 토큰으로 물리적 위치 재검증 (테이블 스푸핑 방지)  
2. `table-session` 키로 활성 `sessionToken` 조회  
3. `session` 키로 `SessionData` 조회 → PIN 일치 확인  
4. `joinedCount >= capacity` 이면 `400 BadRequestException` (인원 초과)  
5. `joinedCount++`, 잔여 TTL 그대로 유지하여 저장  
6. 참여자에게 동일 `sessionToken` 반환 (별도 세션 토큰 없음, 공유 세션)

---

### [3] 자리 이동 — `POST /sessions/move`

**요청 헤더:** `x-session-token`  
**요청 바디:** `{ qrToken: string }` (새 테이블의 QR)

1. 현재 세션 검증 (`validateSession`)  
2. 새 테이블 QR 토큰 검증  
3. 타 매장 이동 차단 (`CROSS_STORE_BLOCKED`)  
4. 새 테이블에 활성 세션 없음 확인  
5. 수용인원 검증 (`newTable.capacity >= sessionData.joinedCount`)  
6. 원자적 키 조작:
   - `DEL old table-session`  
   - `SET new table-session {sessionToken} EX {잔여TTL}`  
   - `SET session:{storeId}:{sessionToken} {갱신된 SessionData} EX {잔여TTL}`

> **관리자 자리 이동** `POST /sessions/admin/tables/:tableId/move`도 동일한 로직이나, QR 토큰 대신 관리자 JWT + `targetTableId`를 사용한다.

---

### [4] TTL 갱신 — `renewSession()`

장바구니에 아이템을 추가할 때마다 자동 호출된다.

```
EXPIRE session:{storeId}:{sessionToken}          7200
EXPIRE session-lookup:{sessionToken}             7200
EXPIRE table-session:{storeId}:{tableId}         7200
SETEX  session:{storeId}:{sessionToken}  7200    (expiresAt 필드도 갱신)
```

---

### [5] 주문 생성 — `POST /orders`

1. `validateSession` → 세션 유효성 확인  
2. 장바구니 조회 → Order + OrderItem DB 저장 (트랜잭션)  
3. 쿠폰 사용 처리, 재고 차감  
4. `clearCart()` → `cart:*` 키 삭제  
5. **세션은 유지됨** — 추가 주문이 가능해야 하기 때문

---

### [종료 A] 결제 완료 시 세션 삭제

`PaymentService.confirmPayment()` 내부 흐름:

```
트랜잭션 커밋 (Payment → COMPLETED, Order → CONFIRMED)
    │
    ▼
SessionService.deleteSession(order.sessionToken)  [best-effort, catch 무시]
    ├─ DEL session:{storeId}:{sessionToken}
    ├─ DEL session-lookup:{sessionToken}
    ├─ DEL cart:{storeId}:{sessionToken}
    └─ DEL table-session:{storeId}:{tableId}
```

트랜잭션 외부에서 best-effort로 호출되므로 세션 삭제 실패가 결제 결과에 영향을 주지 않는다. 세션이 남아있어도 TTL 만료(최대 2시간)로 자동 정리된다.

---

### [종료 B] 고객 직접 종료

`DELETE /sessions` (헤더: `x-session-token`)

- `deleteSession(sessionToken)` 호출 → 4개 키 즉시 삭제

---

### [종료 C] 관리자 강제 종료

`DELETE /sessions/admin/tables/:tableId`

- `forceDeleteTableSession(storeId, tableId)` 호출  
- `table-session` 키로 `sessionToken` 조회 후 4개 키 즉시 삭제

---

### [종료 D] TTL 자동 만료

별도 스케줄러 없이 Redis TTL에 의존한다.  
세션 키 4종 모두 동일한 TTL로 관리되므로 동시에 만료된다.  
단, `renewSession()`이 일부 키만 갱신하다 실패하면 키 간 TTL이 어긋날 수 있다. 이 경우 `joinSession()`·`validateSession()` 내부의 방어 로직이 불일치 키를 정리한다.

---

## 예외 상황 처리

| 상황 | 처리 |
|---|---|
| `table-session`은 있으나 `session` 키가 없음 (비정상) | `joinSession()`이 `table-session` 키를 즉시 삭제 후 400 반환 |
| `table-session`은 있으나 `session` 키가 없음 (관리자 조회) | `getTableSession()`이 `table-session` 키를 즉시 삭제 후 `null` 반환 |
| 타 매장으로 자리 이동 시도 | `CROSS_STORE_BLOCKED` 에러 반환 |
| 인원 초과 상태에서 joinSession | 400 반환, 세션 변경 없음 |
| confirmPayment에서 세션 삭제 실패 | best-effort: 에러 무시, TTL로 자동 만료 |

---

## 관련 파일

| 파일 | 역할 |
|---|---|
| `src/modules/session/session.service.ts` | 세션 CRUD 핵심 로직 |
| `src/modules/session/session.controller.ts` | REST 엔드포인트 |
| `src/common/redis/redis-keys.ts` | Redis 키 패턴 및 TTL 상수 |
| `src/modules/cart/cart.service.ts` | 장바구니 (세션 TTL 동기화, renewSession 호출) |
| `src/modules/order/order.service.ts` | 주문 생성 시 세션 검증 및 장바구니 정리 |
| `src/modules/payment/payment.service.ts` | 결제 완료 시 세션 자동 삭제 |
