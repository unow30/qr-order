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

## AWS 인프라

| 서비스 | 용도 |
|--------|------|
| Route 53 | DNS 라우팅 |
| ACM | SSL/TLS 인증서 |
| CloudFront | 프론트엔드 CDN 배포 |
| S3 | 정적 파일 및 이미지 스토리지 |
| VPC | 네트워크 격리 |
| Load Balancer | 백엔드 트래픽 분산 |
| EC2 (frontend) | 프론트엔드 Docker 컨테이너 |
| EC2 (backend) | 백엔드 Docker 컨테이너 |
| ECR | Docker 이미지 레지스트리 |
| ElastiCache | Redis (세션/캐시) |

> 상세 아키텍처 다이어그램: [`aws-infra.pdf`](../server/aws-infra.pdf)

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
│   ├── OrderHistoryPage.tsx    # 주문 내역 조회
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
│   ├── session.api.ts          # createSession(), joinSession()
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
| `/order-history`    | OrderHistoryPage | 주문 내역 조회 | 예 |
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

### PIN 기반 참여

같은 테이블에 여러 고객이 함께 참여할 경우 PIN 기반 참여 플로우를 사용합니다.

```
QR 스캔 → POST /api/sessions/join (body: { pin })
        → joinedCount 증가 후 sessionToken 발급
```

---

## nginx 구성

고객 앱은 **2계층 nginx** 구조로 서빙됩니다.

### Layer 1 — 엣지 리버스 프록시 ([nginx/nginx.frontend.conf](../../nginx/nginx.frontend.conf))

인프라 레벨에서 외부 요청을 수신해 내부 컨테이너로 라우팅합니다.

- `www.qr-order-demo.it.kr` → `web:80` 업스트림으로 프록시 전달
- bare 도메인(`qr-order-demo.it.kr`) → `www` 301 리다이렉트
- `/health-check` 엔드포인트 자체 응답
- 업스트림 장애(502/503/504) 시 fallback HTML 반환

### Layer 2 — SPA 서빙 ([apps/web/nginx.conf](./nginx.conf))

Dockerfile이 `dist/`를 이미지에 복사한 뒤, 컨테이너 내부 nginx가 정적 파일을 직접 서빙합니다.

| 경로 | Cache-Control | 설명 |
|------|--------------|------|
| `/assets/` | `public, max-age=31536000, immutable` | Vite 해시 번들 — 브라우저 영구 캐시 |
| `/` (그 외) | `no-cache, must-revalidate` | `index.html` — 항상 최신 버전 확인 |

- `try_files $uri $uri/ /index.html` — SPA 클라이언트 라우팅(새로고침) 대응
- gzip 압축 활성화

### 분리 이유

엣지(Layer 1)는 **인프라 관심사**(도메인 라우팅, 헬스체크, 장애 fallback)만 담당하고, 앱 내부(Layer 2)는 **런타임 관심사**(SPA 라우팅 fallback, 정적 캐시 정책)만 담당합니다. 각 앱을 독립적으로 ECR에 배포하거나 교체해도 엣지 설정을 변경할 필요가 없습니다.

---

## SSE 실시간 주문 추적

`useOrderSSE` 훅은 `GET /api/orders/:id/stream`을 구독하여 주문 상태 변경을 실시간으로 수신합니다.

```
서버 → SSE 이벤트 → useOrderSSE 훅 → orderStore 업데이트 → UI 반영
```

주문 상태: `PENDING` → `ACCEPTED` → `PREPARING` → `READY` → `COMPLETED`

---

## 개발 단계

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | 멀티테넌트 기반 (Store/Admin 엔티티, StoreContextMiddleware, RolesGuard, RLS) | ✅ 완료 |
| Phase 2 | 어드민 프론트엔드 (역할별 접근, 매장 전환 UI) | ✅ 완료 |
| Phase 3 | 프랜차이즈 기능 (메뉴 템플릿 배포, 통합 리포트, PostgreSQL RLS) | ✅ 완료 |
| Phase 4 | 세션 관리 (PIN 참여, 자리이동, 관리자 세션 강제 종료) | ✅ 완료 |
| Phase 5 | 이미지 업로드 S3 (presigned URL, 스케줄 이미지, 동적 TTL 캐시) | ✅ 완료 |
| Phase 6 | Admin-readonly (읽기 권한 전용 어드민) | ✅ 완료 |
