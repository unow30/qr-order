# QR Order - Server

QR 테이블 오더 서비스의 REST API 백엔드입니다. NestJS 기반으로 멀티테넌트 아키텍처를 지원합니다.

## 기술 스택

| 항목 | 버전/도구 |
|------|-----------|
| 프레임워크 | NestJS 10.0 |
| ORM | TypeORM |
| 데이터베이스 | PostgreSQL 16 |
| 캐시 | Redis 7 |
| 인증 | JWT + Passport.js |
| 실시간 | SSE (Server-Sent Events) |
| API 문서 | Swagger/OpenAPI |

**포트**: `3000`
**Swagger**: `http://localhost:3000/api/docs`

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

> 상세 아키텍처 다이어그램: [`aws-infra.pdf`](./aws-infra.pdf)

---

## 환경 변수 설정

`.env.example`을 참고하여 `.env` 파일을 생성합니다.

```bash
cp .env.example .env
```

| 변수 | 설명 |
|------|------|
| `NODE_ENV` | 실행 환경 |
| `PORT` | 서버 포트 |
| `DATABASE_HOST` | PostgreSQL 호스트 |
| `DATABASE_PORT` | PostgreSQL 포트 |
| `DATABASE_USER` | DB 사용자 |
| `DATABASE_PASSWORD` | DB 비밀번호 |
| `DATABASE_NAME` | DB 이름 |
| `REDIS_HOST` | Redis 호스트 |
| `REDIS_PORT` | Redis 포트 |
| `REDIS_PASSWORD` | Redis 비밀번호 |
| `JWT_SECRET` | JWT 서명 키 |
| `JWT_EXPIRES_IN` | JWT 만료 시간 |
| `SESSION_TTL_SECONDS` | 세션 TTL (초 단위) |
| `ADMIN_USERNAME` | 초기 SUPER_ADMIN 계정명 |
| `ADMIN_PASSWORD` | 초기 SUPER_ADMIN 비밀번호 |
| `AWS_REGION` | AWS 리전 |
| `AWS_ACCESS_KEY_ID` | AWS 액세스 키 |
| `AWS_SECRET_ACCESS_KEY` | AWS 시크릿 키 |
| `AWS_S3_BUCKET_NAME` | S3 버킷 이름 |
| `PG_MERCHANT_ID` | PG 가맹점 ID |
| `PG_SECRET_KEY` | PG 시크릿 키 |
| `PG_API_URL` | PG API URL |
| `LOG_SLOW_REQUEST_MS` | 슬로우 요청 임계값 (ms, 기본 3000) |
| `LOG_SLOW_QUERY_MS` | 슬로우 쿼리 임계값 (ms, 기본 2000) |
| `LOG_SLACK_WEBHOOK_URL` | Slack 알림 웹훅 URL (선택) |
| `LOG_DISCORD_WEBHOOK_URL` | Discord 알림 웹훅 URL (선택) |
| `LOG_LOKI_URL` | Grafana Loki URL (선택) |

---

## 실행 방법

### 1. DB 및 Redis 시작 (Docker)

```bash
# 루트 디렉토리에서 실행
pnpm db:up
```

### 2. 의존성 설치

```bash
# 루트 디렉토리에서 실행
pnpm install
```

### 3. 개발 서버 실행

```bash
# 서버만 실행
pnpm dev:server

```

### 4. 프로덕션 빌드 및 실행

```bash
pnpm build
pnpm start:prod
```

서버 시작 시 `admins` 테이블이 비어 있으면 `.env`의 `ADMIN_USERNAME` / `ADMIN_PASSWORD`로 SUPER_ADMIN 계정을 자동 생성합니다.

---

## 폴더 구조

```
src/
├── common/                     # 공통 유틸리티
│   ├── decorators/
│   │   ├── current-user.decorator.ts       # @CurrentUser() - JWT 사용자 정보
│   │   ├── current-store-id.decorator.ts   # @CurrentStoreId() - storeId 추출
│   │   └── roles.decorator.ts              # @Roles() - 역할 지정
│   ├── guards/
│   │   └── roles.guard.ts                  # 역할 + storeId 접근 제어
│   ├── middleware/
│   │   └── store-context.middleware.ts     # X-Store-Id 헤더 처리
│   ├── filters/
│   │   └── http-exception.filter.ts        # 전역 예외 필터
│   ├── interceptors/
│   │   └── transform.interceptor.ts        # 응답 변환
│   ├── logging/                            # 요청 로깅 파이프라인
│   │   ├── start/
│   │   │   └── logging.interceptor.ts      # 요청 컨텍스트 초기화 (AsyncLocalStorage)
│   │   ├── collect/
│   │   │   ├── log-event.service.ts        # 서비스 코드용 수동 이벤트 수집 API
│   │   │   ├── redis-logger.proxy.ts       # Redis 명령어 자동 추적 Proxy
│   │   │   └── typeorm-query-logger.ts     # TypeORM 쿼리 자동 추적
│   │   ├── flush/
│   │   │   ├── log-transport.service.ts    # 콘솔 출력 + 외부 전송 (fire-and-forget)
│   │   │   └── transports/
│   │   │       ├── slack.transport.ts
│   │   │       ├── discord.transport.ts
│   │   │       └── loki.transport.ts
│   │   ├── request-log.store.ts            # AsyncLocalStorage 저장소 + addEvent 헬퍼
│   │   ├── request-log.types.ts            # LogEventType, RequestLogContext 타입
│   │   └── logging.module.ts
│   └── rls/
│       ├── rls.module.ts                   # RLS 모듈
│       ├── rls-init.service.ts             # DB 정책 초기화 (OnModuleInit)
│       └── rls.interceptor.ts              # 요청마다 set_config() 주입
│
├── config/
│   ├── database.config.ts                  # TypeORM 설정
│   ├── redis.config.ts                     # Redis 클라이언트
│   └── jwt.config.ts                       # JWT 설정
│
├── modules/
│   ├── auth/                   # 인증 (로그인, JWT, 어드민 CRUD)
│   ├── store/                  # 매장 관리
│   ├── table/                  # 테이블 + QR 토큰 (qrToken 컬럼)
│   ├── menu/                   # 메뉴 (카테고리, 항목, 옵션, 스케줄 이미지)
│   ├── session/                # 고객 세션 (Redis)
│   ├── cart/                   # 장바구니 (Redis)
│   ├── order/                  # 주문 + SSE
│   ├── payment/                # 결제
│   ├── image/                  # 이미지 (S3 presigned URL, 스케줄 관리)
│   ├── report/                 # 매출/주문 리포트
│   ├── coupon/                 # 쿠폰
│   └── review/                 # 리뷰
│
├── database/
│   └── seed.ts                 # DB 시드 데이터
│
├── app.module.ts               # 루트 모듈
└── main.ts                     # 진입점 (CORS, Swagger, 전역 설정)
```

---

## API 엔드포인트

### 인증 (`/api/auth`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| POST | `/api/auth/login` | 로그인 (JWT 발급) | 공개 |

### 어드민 계정 (`/api/admins`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/admins` | 어드민 목록 | SUPER_ADMIN |
| POST | `/api/admins` | 어드민 생성 | SUPER_ADMIN |
| DELETE | `/api/admins/:id` | 어드민 삭제 | SUPER_ADMIN |

### 매장 (`/api/stores`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/stores` | 매장 목록 | SUPER_ADMIN |
| POST | `/api/stores` | 매장 생성 | SUPER_ADMIN |
| PATCH | `/api/stores/:id` | 매장 수정 | SUPER_ADMIN |
| DELETE | `/api/stores/:id` | 매장 삭제 | SUPER_ADMIN |

### 테이블 (`/api/tables`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/tables` | 테이블 목록 | 어드민 |
| POST | `/api/tables` | 테이블 생성 | 어드민 |
| DELETE | `/api/tables/:id` | 테이블 삭제 | 어드민 |

### 메뉴 (`/api/menu`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/menu` | 전체 메뉴 조회 | 공개 (세션) |
| POST | `/api/menu/categories` | 카테고리 생성 | 어드민 |
| POST | `/api/menu/items` | 메뉴 항목 생성 | 어드민 |
| PATCH | `/api/menu/items/:id` | 메뉴 항목 수정 | 어드민 |
| DELETE | `/api/menu/items/:id` | 메뉴 항목 삭제 | 어드민 |
| POST | `/api/menu/deploy` | 메뉴 템플릿 배포 | SUPER_ADMIN |

### 세션 (`/api/sessions`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| POST | `/api/sessions` | 세션 생성 (QR 토큰) | 공개 |
| POST | `/api/sessions/join` | PIN으로 기존 세션 참여 | 공개 |
| POST | `/api/sessions/move` | 자리이동 (QR 재스캔) | 세션 |
| DELETE | `/api/sessions` | 세션 종료 | 세션 |
| GET | `/api/sessions/admin/tables/:tableId` | 테이블 활성 세션 조회 | 어드민 |
| POST | `/api/sessions/admin/tables/:tableId/move` | 관리자 자리이동 | 어드민 |
| DELETE | `/api/sessions/admin/tables/:tableId` | 강제 세션 삭제 | 어드민 |

### 장바구니 (`/api/cart`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/cart` | 장바구니 조회 | 세션 |
| POST | `/api/cart` | 항목 추가 | 세션 |
| DELETE | `/api/cart/:itemId` | 항목 삭제 | 세션 |
| DELETE | `/api/cart` | 장바구니 초기화 | 세션 |

### 주문 (`/api/orders`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| POST | `/api/orders` | 주문 생성 | 세션 |
| GET | `/api/orders` | 주문 목록 | 어드민 |
| GET | `/api/orders/:id` | 주문 상세 | 세션/어드민 |
| PATCH | `/api/orders/:id/status` | 주문 상태 변경 | 어드민 |
| GET | `/api/orders/sse` | SSE 이벤트 구독 | 어드민 |

### 결제 (`/api/payments`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| POST | `/api/payments` | 결제 요청 | 세션 |
| POST | `/api/payments/callback` | 결제 콜백 | 공개 |

### 쿠폰 (`/api/coupons`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/coupons` | 쿠폰 목록 | 어드민 |
| POST | `/api/coupons` | 쿠폰 생성 | 어드민 |
| PATCH | `/api/coupons/:id` | 쿠폰 수정 | 어드민 |
| DELETE | `/api/coupons/:id` | 쿠폰 삭제 | 어드민 |

### 리뷰 (`/api/reviews`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/reviews` | 리뷰 목록 | 어드민 |
| DELETE | `/api/reviews/:id` | 리뷰 삭제 | 어드민 |

### 이미지 (`/api/images`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| POST | `/api/images/presigned-url` | S3 업로드용 presigned URL 발급 | 어드민 |
| GET | `/api/images/:entityType/:entityId/active` | 활성 이미지 조회 (캐시) | 공개 |
| DELETE | `/api/images/:id` | 이미지 삭제 | 어드민 |

### 리포트 (`/api/reports`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/reports/summary` | 전체 매장 통합 리포트 | SUPER_ADMIN |
| GET | `/api/reports/stores/:storeId` | 개별 매장 리포트 | 어드민 |

---

## 인증 구조

### JWT Payload

```json
{
  "sub": 1,
  "username": "admin",
  "role": "SUPER_ADMIN",
  "storeId": null
}
```

| 역할                     | 설명                         |
|------------------------|----------------------------|
| `SUPER_ADMIN`          | 모든 매장에 대한 전체 권한            |
| `STORE_ADMIN_READONLY` | 모든 매장에 접근 가능하나, get 요청만 가능 |
| `STORE_ADMIN`          | 본인 매장(`storeId`)에만 접근 가능   |

### 요청 헤더

```
Authorization: Bearer <jwt-token>
X-Store-Id: <storeId>            # SUPER_ADMIN이 매장 전환 시 사용
X-Session-Token: <sessionToken>  # 고객 앱 요청 시 사용
```

---

## 멀티테넌트 아키텍처

### X-Store-Id 처리 흐름

```
요청 → StoreContextMiddleware → req.storeId 설정
           ↓
      CurrentStoreId 데코레이터
           ↓
  1순위: req.storeId (X-Store-Id 헤더)
  2순위: req.user.storeId (JWT 클레임)
```

### RolesGuard 검증 순서

1. JWT 인증 확인
2. `@Roles()` 데코레이터로 지정된 역할 검증
3. `STORE_ADMIN`이 다른 매장에 접근 시 403 반환

---

## Redis 키 패턴

| 키 | 설명 | TTL |
|----|------|-----|
| `session:{storeId}:{sessionToken}` | 고객 세션 정보 | 2시간 |
| `session-lookup:{sessionToken}` | 세션 → storeId 역조회 | 2시간 |
| `tableSession:{storeId}:{tableId}` | 테이블별 활성 세션 토큰 | 2시간 |
| `cart:{storeId}:{sessionToken}` | 장바구니 데이터 | 2시간 |
| `menu:{storeId}:all` | 메뉴 캐시 | 동적 TTL (다음 이미지 상태 변경 시까지) |

---

## PostgreSQL RLS (Row-Level Security)

서버 시작 시 `RlsInitService`가 자동으로 RLS 정책을 생성합니다.

**보호 테이블**: `menu_categories`, `orders`, `tables`

**정책 조건**:
- `app.role = 'SUPER_ADMIN'` → 모든 행 접근 허용
- 그 외 → `store_id = app.store_id` 행만 접근 허용

모든 요청은 `RlsInterceptor`를 통해 PostgreSQL 세션 변수(`set_config`)를 주입합니다.

---

## 로깅

`common/logging/` 모듈은 HTTP 요청별로 이벤트를 수집하는 3단계 파이프라인 구조입니다.

```
요청 진입
  → [1-start] LoggingInterceptor
      AsyncLocalStorage로 RequestLogContext 생성, X-Request-Id 헤더 설정
          ↓
  → [2-collect] 이벤트 자동/수동 수집
      · TypeOrmQueryLogger   — TypeORM 쿼리 자동 추적 (SELECT / MUTATION)
      · createRedisLoggerProxy — Redis 명령어 자동 추적 (HIT / MISS / SET / DEL)
      · LogEventService.logic() / .warning() — 서비스 코드에서 수동 기록
          ↓
  → [3-flush] LogTransportService.flush()
      · 개발 환경: 컬러 pretty-print (요청 요약 + 이벤트 타임라인)
      · 프로덕션: JSON 한 줄 출력
      · 외부 전송 (fire-and-forget): Slack / Discord / Grafana Loki
```

### 이벤트 타입

| 타입 | 아이콘 | 설명 |
|------|--------|------|
| `cache_hit` | 💾 HIT | Redis 캐시 명중 |
| `cache_miss` | 💾 MISS | Redis 캐시 미스 |
| `cache_set` | 💾 SET | Redis 값 저장 |
| `cache_del` | 💾 DEL | Redis 키 삭제 |
| `query_select` | 🔍 SELECT | TypeORM SELECT 쿼리 |
| `query_mutation` | ✏️ MUTATION | TypeORM INSERT/UPDATE/DELETE |
| `logic` | 🔧 LOGIC | 서비스 코드 수동 기록 |
| `warning` | ⚠️ WARNING | 경고 (슬로우 쿼리 포함) |

### 외부 전송 채널

| 채널 | 설정 env |
|------|----------|
| Slack | `LOG_SLACK_WEBHOOK_URL` |
| Discord | `LOG_DISCORD_WEBHOOK_URL` |
| Grafana Loki | `LOG_LOKI_URL` |

웹훅 URL이 없으면 해당 채널은 무시됩니다. 외부 전송은 메인 요청 흐름에 영향을 주지 않습니다.

---

## 개발 단계

| Phase | 내용                                                                  | 상태 |
|-------|---------------------------------------------------------------------|------|
| Phase 1 | 멀티테넌트 기반 (Store/Admin 엔티티, StoreContextMiddleware, RolesGuard, RLS) | ✅ 완료 |
| Phase 2 | 어드민 프론트엔드 (역할별 접근, 매장 전환 UI)                                        | ✅ 완료 |
| Phase 3 | 프랜차이즈 기능 (메뉴 템플릿 배포, 통합 리포트, PostgreSQL RLS)                        | ✅ 완료 |
| Phase 4 | 세션 관리 (PIN 참여, 자리이동, 관리자 세션 강제 종료)                                  | ✅ 완료 |
| Phase 5 | 이미지 업로드 S3 (presigned URL, 스케줄 이미지, 동적 TTL 캐시)                      | ✅ 완료 |
| Phase 6 | Admin-readonly (읽기 권한 전용 어드민)                                | ✅ 완료 |
