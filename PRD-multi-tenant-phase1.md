# PRD: QR 오더 멀티 테넌트 전환 — Phase 1 기반 구축

| 항목 | 내용 |
|------|------|
| 문서 버전 | v1.0 |
| 작성일 | 2026-03-10 |
| 상태 | 초안 (Draft) |

---

## 1. 요약 (Summary)

현재 QR 테이블 오더 서비스는 단일 매장만 지원하는 구조다. 이 문서는 프랜차이즈처럼 여러 매장이 동일한 시스템을 독립적으로 사용할 수 있도록 전환하는 **Phase 1 기반 작업**을 정의한다. Phase 1은 데이터 격리, 매장 컨텍스트 처리, 어드민 권한 분리라는 세 가지 핵심 기반을 만드는 데 집중한다.

---

## 2. 이해관계자 (Contacts)

| 이름 | 역할 | 비고 |
|------|------|------|
| 개발팀 | 설계 · 구현 | 백엔드 / 프론트엔드 전체 |
| 프랜차이즈 본사 | 주요 고객 | 여러 지점을 한 계정으로 관리하고 싶어하는 운영자 |
| 매장 어드민 | 최종 사용자 | 본인 매장만 관리하는 점주 |
| 고객 (테이블 이용자) | 최종 사용자 | QR 코드로 주문하는 손님 |

---

## 3. 배경 (Background)

### 현재 상황

QR 오더는 한 매장을 위해 설계된 서비스다. 현재 코드베이스를 분석하면 다음과 같은 한계가 있다.

- **데이터 혼재 위험**: `tables`, `menu_categories` 등 테이블에 `storeId` 컬럼이 있지만, 실제 API 쿼리에서 `storeId` 필터링이 일관되게 적용되지 않는다.
- **Redis 키 충돌**: 세션(`session:{token}`), 장바구니(`cart:{token}`), 메뉴 캐시(`menu:all`)가 전역 키를 사용해 여러 매장이 동시에 사용하면 데이터가 섞인다.
- **단일 어드민 계정**: 어드민 로그인이 단일 `ADMIN_USERNAME/ADMIN_PASSWORD`로만 동작해 매장별 독립 어드민 계정이 없다.
- **`stores` 테이블 없음**: 매장 자체를 관리하는 엔티티와 API가 존재하지 않는다.

### 왜 지금인가?

프랜차이즈 운영사로부터 "여러 지점에서 하나의 시스템을 쓰고 싶다"는 수요가 확인되었다. 지금 데이터 격리와 구조 변경 없이 매장을 추가하면 나중에 데이터를 분리하기가 매우 어려워진다. 초기에 기반을 올바르게 잡는 것이 훨씬 저렴하다.

---

## 4. 목표 (Objective)

### 목표

여러 매장이 **동일한 서버 인스턴스**를 사용하면서도 각 매장의 데이터(메뉴, 테이블, 주문, 세션)가 **완전히 격리**되도록 한다.

### 이것이 중요한 이유

- **본사 입장**: 하나의 계약으로 모든 지점을 관리할 수 있어 운영 비용이 줄어든다.
- **지점 입장**: 다른 지점의 데이터를 볼 수 없어 보안이 보장된다.
- **개발팀 입장**: 이 기반 위에 메뉴 템플릿 배포, 통합 통계 등 프랜차이즈 기능을 안전하게 추가할 수 있다.

### 성공 지표 (Key Results)

| 지표 | 현재 | 목표 |
|------|------|------|
| 멀티 매장 동시 운영 가능 여부 | 불가 | 가능 (데이터 격리 확인) |
| Redis 키 충돌 건수 | 측정 불가 | 0건 (네임스페이스 분리 후) |
| 매장 어드민이 타 매장 데이터 접근 | 접근 가능 | 차단됨 (API 레벨 검증) |
| 신규 매장 등록 소요 시간 | 수동 설정 필요 | API 호출 1회로 완료 |

---

## 5. 대상 고객 (Market Segments)

### Segment A — 프랜차이즈 본사 운영자
- **누구인가**: 2개 이상 지점을 가진 외식 브랜드의 본사 운영팀
- **무엇을 원하는가**: 모든 지점을 한 계정으로 관리, 지점 추가/비활성화 권한
- **제약 사항**: 지점별 메뉴/가격이 다를 수 있어 완전한 통일 강제는 안 된다

### Segment B — 개별 매장 어드민 (점주/직원)
- **누구인가**: 본사로부터 계정을 받은 지점 점주 또는 직원
- **무엇을 원하는가**: 본인 매장의 테이블, 메뉴, 주문만 관리
- **제약 사항**: 다른 지점 데이터는 보이면 안 됨

### Segment C — 고객 (테이블 이용자)
- **누구인가**: QR 코드를 스캔해 주문하는 손님
- **영향**: Phase 1에서 고객 경험은 거의 변화 없음. 세션이 올바른 매장에 연결되는지 투명하게 처리됨

---

## 6. 가치 제안 (Value Proposition)

### 프랜차이즈 본사 운영자를 위한 가치

| 구분 | 내용 |
|------|------|
| **해결하는 일(Job)** | 여러 지점을 각각 다른 시스템으로 관리하는 번거로움 제거 |
| **얻는 것(Gain)** | 하나의 계정으로 전체 지점 현황 파악, 신규 지점 빠른 개설 |
| **피하는 것(Pain)** | 지점마다 별도 계약, 별도 서버, 별도 설정 관리 |

### 매장 어드민을 위한 가치

| 구분 | 내용 |
|------|------|
| **해결하는 일(Job)** | 본인 매장 운영에만 집중 |
| **얻는 것(Gain)** | 명확한 권한 범위, 다른 지점 간섭 없음 |
| **피하는 것(Pain)** | 실수로 다른 지점 데이터를 수정하거나 삭제하는 위험 |

---

## 7. 솔루션 (Solution)

### 7.1 사용자 흐름 변경

#### 기존 흐름 (단일 매장)
```
[고객] QR 스캔 → /api/sessions (qrToken) → 세션 생성
[어드민] 로그인 → JWT → 모든 데이터 접근
```

#### 변경 후 흐름 (멀티 테넌트)
```
[고객] QR 스캔 → /api/sessions (qrToken) → storeId 추출 → 격리된 세션 생성
[슈퍼 어드민] 로그인 → JWT(role: SUPER_ADMIN) → 전체 매장 접근
[매장 어드민] 로그인 → JWT(role: STORE_ADMIN, storeId) → 본인 매장만 접근
```

---

### 7.2 핵심 기능 (Key Features)

---

#### Feature 1 — `stores` 엔티티 및 매장 관리 API

**무엇인가**: 매장 정보를 저장하는 새 테이블과 CRUD API

**DB 스키마 (신규 테이블: `stores`)**
```
stores
├── id          UUID PK
├── name        VARCHAR(100)     -- 매장명 (예: "강남점")
├── slug        VARCHAR(50) UNIQUE -- URL 식별자 (예: "gangnam")
├── isActive    BOOLEAN DEFAULT true
├── createdAt   TIMESTAMP
└── updatedAt   TIMESTAMP
```

**API 엔드포인트**
| 메서드 | 경로 | 권한 | 설명 |
|--------|------|------|------|
| POST | `/api/stores` | SUPER_ADMIN | 신규 매장 등록 |
| GET | `/api/stores` | SUPER_ADMIN | 전체 매장 목록 |
| GET | `/api/stores/:id` | SUPER_ADMIN / 해당 STORE_ADMIN | 매장 상세 |
| PATCH | `/api/stores/:id` | SUPER_ADMIN | 매장 정보 수정 |
| DELETE | `/api/stores/:id` | SUPER_ADMIN | 매장 비활성화 |

**수용 조건**
- 슬러그(slug)는 영문 소문자, 숫자, 하이픈만 허용
- 비활성화는 소프트 삭제 (`isActive: false`)
- 슈퍼 어드민만 생성/삭제 가능

---

#### Feature 2 — 어드민 계정 시스템 재설계

**무엇인가**: 현재의 단일 `ADMIN_USERNAME/PASSWORD` 환경변수 방식을 DB 기반 어드민 계정으로 전환

**DB 스키마 (신규 테이블: `admins`)**
```
admins
├── id          UUID PK
├── username    VARCHAR(50) UNIQUE
├── password    VARCHAR(255)     -- bcrypt hash
├── role        ENUM('SUPER_ADMIN', 'STORE_ADMIN')
├── storeId     UUID FK → stores.id (STORE_ADMIN만 필수)
├── isActive    BOOLEAN DEFAULT true
├── createdAt   TIMESTAMP
└── updatedAt   TIMESTAMP
```

**JWT Payload 변경**
```typescript
// 기존
{ sub: 'admin', username: 'admin' }

// 변경 후
{ sub: adminId, username: string, role: 'SUPER_ADMIN' | 'STORE_ADMIN', storeId?: string }
```

**API 엔드포인트**
| 메서드 | 경로 | 권한 | 설명 |
|--------|------|------|------|
| POST | `/api/auth/login` | 공개 | 로그인 (기존 유지) |
| POST | `/api/admins` | SUPER_ADMIN | 어드민 계정 생성 |
| GET | `/api/admins` | SUPER_ADMIN | 어드민 목록 |

**초기 데이터 시딩**
- 환경변수(`ADMIN_USERNAME`, `ADMIN_PASSWORD`)로 최초 슈퍼 어드민 1개 자동 생성
- 기존 운영 환경과의 하위 호환 유지

**수용 조건**
- `STORE_ADMIN` 생성 시 반드시 `storeId` 필요
- `SUPER_ADMIN` 생성은 `SUPER_ADMIN`만 가능

---

#### Feature 3 — 매장 컨텍스트 미들웨어

**무엇인가**: 모든 요청에서 현재 매장(`storeId`)을 자동으로 추출하여 Request 객체에 주입하는 NestJS 미들웨어

**매장 식별 방법 (우선순위 순)**
1. **JWT 클레임** (`STORE_ADMIN` 로그인 시): 토큰 내 `storeId` 사용
2. **요청 헤더** (`X-Store-Id`): QR 스캔 → 세션 생성 시 사용
3. **URL 경로 파라미터** (`/api/stores/:storeId/...`): 슈퍼 어드민 API

**미들웨어 동작**
```
요청 수신
  ↓
StoreContextMiddleware
  ├─ JWT에 storeId 있음? → req.storeId = jwt.storeId
  ├─ X-Store-Id 헤더 있음? → req.storeId = header 값 (DB 존재 여부 검증)
  └─ 없음? → req.storeId = null (슈퍼 어드민 또는 공개 엔드포인트)
  ↓
StoreGuard (보호된 엔드포인트)
  ├─ SUPER_ADMIN → 모든 storeId 허용
  └─ STORE_ADMIN → req.storeId === jwt.storeId 일치 검증
```

**수용 조건**
- 잘못된 `X-Store-Id` 전달 시 `403 Forbidden`
- `storeId`가 `isActive: false`인 매장이면 `403 Forbidden`
- 미들웨어는 전역 적용, 공개 엔드포인트는 storeId 없어도 통과

---

#### Feature 4 — Redis 네임스페이스 분리

**무엇인가**: 현재 전역 Redis 키에 `storeId`를 추가하여 매장 간 데이터 충돌 방지

**키 패턴 변경**

| 데이터 | 기존 키 | 변경 후 키 |
|--------|--------|-----------|
| 세션 | `session:{sessionToken}` | `session:{storeId}:{sessionToken}` |
| 장바구니 | `cart:{sessionToken}` | `cart:{storeId}:{sessionToken}` |
| 메뉴 캐시 | `menu:all` | `menu:{storeId}:all` |

**SessionData 인터페이스 변경**
```typescript
// 기존
interface SessionData {
  sessionToken: string;
  tableId: string;
  tableNumber: number;
  tableName: string;
  createdAt: string;
  expiresAt: string;
}

// 변경 후
interface SessionData {
  sessionToken: string;
  storeId: string;       // 추가
  tableId: string;
  tableNumber: number;
  tableName: string;
  createdAt: string;
  expiresAt: string;
}
```

**수용 조건**
- 세션 생성(`POST /api/sessions`) 시 QR 토큰 → 테이블 → `storeId` 역추적하여 저장
- 장바구니 조회 시 세션에서 `storeId`를 꺼내 Redis 키에 사용
- 메뉴 캐시는 매장별로 별도 저장 (한 매장 메뉴 변경이 다른 매장 캐시에 영향 없음)

---

#### Feature 5 — 기존 TypeORM 쿼리에 storeId 필터 일관 적용

**무엇인가**: 모든 데이터 조회/수정/삭제 쿼리에 `WHERE storeId = :storeId` 조건 추가

**영향받는 모듈 및 주요 변경 사항**

| 모듈 | 변경 내용 |
|------|---------|
| `TableService` | `findAll()`, `findOne()` 등에 `{ storeId }` 조건 추가 |
| `MenuService` | `getMenu()`, 카테고리/아이템 CRUD에 `storeId` 조건 추가 |
| `OrderService` | `findAll()` (어드민용 주문 목록)에 `storeId` 조건 추가 |
| `SessionService` | 세션 생성 시 Redis 키에 `storeId` prefix 추가 |
| `CartService` | 장바구니 Redis 키에 `storeId` prefix 추가 |

**수용 조건**
- `SUPER_ADMIN`이 특정 매장 데이터를 조회할 때는 쿼리 파라미터 또는 경로로 `storeId` 지정
- `STORE_ADMIN`은 JWT의 `storeId`가 자동으로 쿼리에 주입됨
- 필터 미적용 쿼리는 코드 리뷰에서 차단

---

### 7.3 기술 구현 가이드

#### 전체 변경 영향도

```
packages/shared-types/
  ├── entities/store.types.ts          (신규) — Store, Admin 타입
  ├── entities/table.types.ts          (수정) — 변경 없음 (storeId 이미 있음)
  └── api/session.dto.ts               (수정) — SessionData에 storeId 추가

apps/server/src/
  ├── modules/store/                   (신규) — Store 모듈 전체
  │   ├── store.module.ts
  │   ├── store.controller.ts
  │   ├── store.service.ts
  │   └── entities/store.entity.ts
  ├── modules/auth/
  │   ├── entities/admin.entity.ts     (신규) — Admin DB 엔티티
  │   ├── auth.service.ts              (수정) — DB 기반 로그인
  │   └── strategies/jwt.strategy.ts  (수정) — role, storeId 클레임 추가
  ├── common/
  │   ├── middleware/store-context.middleware.ts  (신규)
  │   └── guards/store.guard.ts                   (신규)
  ├── modules/session/session.service.ts  (수정) — Redis 키 변경
  ├── modules/cart/cart.service.ts        (수정) — Redis 키 변경
  ├── modules/menu/menu.service.ts        (수정) — Redis 키 + 쿼리 필터
  ├── modules/table/table.service.ts      (수정) — 쿼리 필터
  └── modules/order/order.service.ts     (수정) — 쿼리 필터
```

#### 데이터 마이그레이션 전략

Phase 1 배포 전 기존 데이터 처리:
1. `stores` 테이블에 기본 매장 1개 삽입 (`id: '00000000-...'`, `slug: 'default'`)
2. `admins` 테이블에 기존 `ADMIN_USERNAME/PASSWORD`로 SUPER_ADMIN 계정 생성
3. 기존 `tables`, `menu_categories` 등의 `storeId` 컬럼을 기본 매장 ID로 업데이트
4. Redis 키는 기존 것이 TTL에 의해 자연 소멸하도록 대기 (세션 최대 2시간)

---

### 7.4 핵심 가정 (Assumptions)

| # | 가정 | 위험도 | 검증 방법 |
|---|------|--------|---------|
| A1 | 한 서버 인스턴스로 멀티 테넌트를 처리해도 성능이 충분하다 | 낮음 | 부하 테스트 |
| A2 | 모든 매장은 동일한 서버 URL을 공유한다 (subdomain 분리 안 함) | 낮음 | 초기 운영 후 필요 시 subdomain 추가 |
| A3 | 프랜차이즈 본사는 각 지점 메뉴를 독립적으로 관리하는 것을 허용한다 | 중간 | 본사 운영팀 인터뷰 |
| A4 | 기존 운영 중인 단일 매장 데이터의 마이그레이션은 다운타임 없이 가능하다 | 중간 | 마이그레이션 스크립트 사전 검증 |
| A5 | Redis 키 변경 시 기존 활성 세션이 만료되는 것을 사용자가 감수할 수 있다 | 낮음 | 배포 저녁 시간대 진행 |

---

## 8. 출시 계획 (Release)

### Phase 1 — 기반 구축 (이 문서의 범위)
**예상 소요**: 2~3주

| 주차 | 작업 |
|------|------|
| 1주차 | `stores` 엔티티 + 매장 관리 API, `admins` 엔티티 + 로그인 재설계 |
| 2주차 | 매장 컨텍스트 미들웨어 + StoreGuard, Redis 네임스페이스 분리 |
| 3주차 | 기존 Service/Query storeId 필터 적용, 통합 테스트, 마이그레이션 스크립트 |

**완료 기준 (Definition of Done)**
- [ ] 두 개의 매장을 만들고, 각 매장의 메뉴/테이블/주문이 완전히 분리됨을 확인
- [ ] 매장 어드민 A가 매장 B의 데이터에 접근 시 403 응답
- [ ] Redis 키에 storeId prefix가 올바르게 적용됨
- [ ] 기존 단일 매장 기능이 정상 동작함 (회귀 테스트)

### Phase 2 — 슈퍼 어드민 UI (다음 단계)
- 슈퍼 어드민 대시보드 (매장 전환 UI, 매장별 현황 카드)
- 신규 매장 온보딩 플로우 UI

### Phase 3 — 프랜차이즈 기능 (미래)
- 메뉴 템플릿 배포 (본사 → 지점)
- 통합 매출/주문 리포트
- PostgreSQL Row-Level Security 적용 (보안 강화)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|---------|
| v1.0 | 2026-03-10 | 최초 작성 |
