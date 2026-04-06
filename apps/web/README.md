# QR Order - Web (고객용)

QR 코드를 스캔한 고객이 메뉴를 조회하고 주문하는 모바일 웹앱입니다.

## 기술 스택

| 항목 | 버전/도구 |
|------|-----------|
| 프레임워크 | React 18 |
| 빌드 도구 | Vite |
| 상태 관리 | Zustand |
| HTTP 클라이언트 | Axios |
| 라우팅 | React Router v6 |

**포트**: `3001`

---

## 실행 방법

### 개발 서버

```bash
# 루트 디렉토리에서 실행
pnpm dev:web

# 또는 apps/web 디렉토리에서
pnpm dev
```

### 빌드

```bash
pnpm build
```

> 서버(`apps/server`)가 `localhost:3000`에서 실행 중이어야 합니다.

---

## 폴더 구조

```
src/
├── main.tsx                    # React 진입점
├── router.tsx                  # 라우팅 (RequireSession 보호)
│
├── pages/
│   ├── EntryPage.tsx           # QR 토큰 처리 및 세션 생성
│   ├── MenuPage.tsx            # 메뉴 목록
│   ├── MenuDetailPage.tsx      # 메뉴 상세 + 옵션 선택
│   ├── CartPage.tsx            # 장바구니
│   ├── PaymentPage.tsx         # 결제
│   ├── OrderStatusPage.tsx     # 주문 현황 (SSE 실시간)
│   └── StorePage.tsx           # 개발용 매장/테이블 QR 링크 확인 페이지
│
├── stores/                     # Zustand 상태
│   ├── sessionStore.ts         # 세션 토큰, 테이블 정보
│   ├── cartStore.ts            # 장바구니 아이템
│   ├── orderStore.ts           # 주문 정보
│   └── couponStore.ts          # 쿠폰 정보
│
├── api/                        # API 클라이언트
│   ├── client.ts               # axios 인스턴스 (X-Session-Token 자동 주입)
│   ├── session.api.ts          # createSession()
│   ├── menu.api.ts             # getMenu()
│   ├── cart.api.ts             # 장바구니 CRUD
│   ├── order.api.ts            # createOrder(), getOrder()
│   ├── payment.api.ts          # 결제 요청
│   └── coupon.api.ts           # 쿠폰 적용
│
├── hooks/
│   └── useOrderSSE.ts          # SSE 구독 훅
│
└── components/                 # 재사용 가능한 컴포넌트
```

---

## 페이지 및 라우트

| 경로                  | 페이지 | 설명 | 세션 필요 |
|---------------------|--------|------|-----------|
| `/entry`            | EntryPage | QR 토큰 파싱 및 세션 생성 | 아니오 |
| `/menu`             | MenuPage | 메뉴 카테고리 및 목록 | 예 |
| `/menu/:id`         | MenuDetailPage | 메뉴 상세 및 옵션 선택 | 예 |
| `/cart`             | CartPage | 장바구니 확인 및 수정 | 예 |
| `/payment`          | PaymentPage | 결제 진행 | 예 |
| `/order-status/:id` | OrderStatusPage | 실시간 주문 현황 | 예 |
| `/store`            | StorePage | 개발용 매장 목록 및 테이블 QR 입장 링크 확인 | 아니오 |

세션이 없는 상태에서 보호된 경로에 접근하면 `/entry`로 리다이렉트됩니다.

---

## 주문 플로우

```
QR 코드 스캔
     ↓
/entry — QR 토큰 파싱 → POST /api/sessions → sessionToken 발급
     ↓
/menu — GET /api/menu → 메뉴 목록 표시
     ↓
/menu/:id — 옵션 선택 → 장바구니 추가
     ↓
/cart — 장바구니 확인 및 수량 조정
     ↓
/payment — 결제 방법 선택 → POST /api/payments
     ↓
/order-status/:id — SSE로 실시간 주문 상태 수신
```

---

## 세션 관리

고객 세션은 QR 토큰을 기반으로 생성되며 Redis에 저장됩니다.

```
QR 토큰 (/entry?token=xxx) → POST /api/sessions
                           → sessionToken 발급
                           → LocalStorage에 저장
```

이후 모든 API 요청에 `X-Session-Token` 헤더가 자동으로 주입됩니다.

```
X-Session-Token: <sessionToken>
```

`sessionStore`는 Zustand persist를 사용하여 LocalStorage에 세션 토큰과 테이블 정보를 저장합니다.

---

## SSE 실시간 주문 추적

`useOrderSSE` 훅은 `GET /api/orders/:id/stream`을 구독하여 주문 상태 변경을 실시간으로 수신합니다.

```
서버 → SSE 이벤트 → useOrderSSE 훅 → orderStore 업데이트 → UI 반영
```

주문 상태: `PENDING` → `ACCEPTED` → `PREPARING` → `READY` → `COMPLETED`

---