# QR Order - Admin (어드민)

매장 운영자와 슈퍼 어드민이 사용하는 관리자 대시보드입니다. 주문 관리, 메뉴 편집, 매장 관리, 리포트 등의 기능을 제공합니다.

## 기술 스택

| 항목 | 버전/도구 |
|------|-----------|
| 프레임워크 | React 18 |
| 빌드 도구 | Vite |
| 상태 관리 | Zustand |
| HTTP 클라이언트 | Axios |
| 라우팅 | React Router v6 |
| QR 코드 | qrcode.react |

**포트**: `3002`

---

## 실행 방법

### 개발 서버

```bash
# 루트 디렉토리에서 실행
pnpm dev:admin

# 또는 apps/admin 디렉토리에서
pnpm dev
```

### 빌드

```bash
pnpm build
```

> 서버(`apps/server`)가 `localhost:3000`에서 실행 중이어야 합니다.

---

## 기본 로그인 정보

| 항목 | 값 |
|------|----|
| 아이디 | `admin` |
| 비밀번호 | `admin1234` |
| 역할 | `SUPER_ADMIN` |

서버 시작 시 `admins` 테이블이 비어 있으면 `.env`의 `ADMIN_USERNAME` / `ADMIN_PASSWORD`로 자동 생성됩니다.

---

## 폴더 구조

```
src/
├── main.tsx                        # React 진입점
├── router.tsx                      # 라우팅 (ProtectedRoute, SuperAdminRoute)
│
├── pages/
│   ├── LoginPage.tsx               # 로그인 (JWT 발급)
│   ├── DashboardPage.tsx           # 대시보드
│   ├── OrderManagePage.tsx         # 주문 관리 (SSE 실시간)
│   ├── MenuManagePage.tsx          # 메뉴 관리
│   ├── TableManagePage.tsx         # 테이블 관리
│   ├── QRGeneratePage.tsx          # QR 코드 생성
│   ├── KDSPage.tsx                 # 주방 디스플레이 (KDS)
│   ├── StoreManagePage.tsx         # 매장/어드민 관리 (SUPER_ADMIN 전용)
│   ├── ReportPage.tsx              # 통합 매출 리포트
│   ├── CouponManagePage.tsx        # 쿠폰 관리
│   └── ReviewManagePage.tsx        # 리뷰 관리
│
├── stores/
│   └── authStore.ts                # JWT, role, storeId, currentStoreId, isSuperAdmin
│
├── api/
│   ├── client.ts                   # axios 인스턴스 (Authorization + X-Store-Id 자동 주입)
│   ├── auth.api.ts                 # login() - JWT 발급
│   ├── store.api.ts                # 매장/어드민 CRUD
│   ├── menu.api.ts                 # 메뉴 CRUD + deployMenu()
│   ├── order.api.ts                # 주문 조회/상태 변경
│   ├── table.api.ts                # 테이블 CRUD
│   ├── coupon.api.ts               # 쿠폰 CRUD
│   ├── review.api.ts               # 리뷰 조회
│   └── report.api.ts               # 리포트 조회
│
└── components/
    ├── ConfirmDialog.tsx            # 공통 확인 다이얼로그
    └── layout/
        └── AdminLayout.tsx          # 레이아웃 (사이드바, 매장 전환 UI)
```

---

## 페이지 및 라우트

| 경로 | 페이지 | 설명 | 접근 권한 |
|------|--------|------|-----------|
| `/login` | LoginPage | 로그인 | 공개 |
| `/dashboard` | DashboardPage | 대시보드 | 어드민 |
| `/orders` | OrderManagePage | 주문 관리 | 어드민 |
| `/menu` | MenuManagePage | 메뉴 편집 | 어드민 |
| `/tables` | TableManagePage | 테이블 편집 | 어드민 |
| `/qr` | QRGeneratePage | QR 코드 생성/출력 | 어드민 |
| `/kds` | KDSPage | 주방 디스플레이 | 어드민 |
| `/stores` | StoreManagePage | 매장/어드민 관리 | **SUPER_ADMIN** |
| `/reports` | ReportPage | 통합 매출 리포트 | 어드민 |
| `/coupons` | CouponManagePage | 쿠폰 관리 | 어드민 |
| `/reviews` | ReviewManagePage | 리뷰 관리 | 어드민 |

로그인하지 않은 상태에서 보호된 경로에 접근하면 `/login`으로 리다이렉트됩니다.
`/stores`는 `SuperAdminRoute`로 감싸져 있어 `SUPER_ADMIN`이 아니면 접근이 차단됩니다.

---

## 역할별 기능

### SUPER_ADMIN

- 모든 매장 데이터에 접근 가능
- 매장 생성/수정/삭제
- 어드민 계정 생성/삭제
- 매장 간 메뉴 템플릿 배포 (`/api/menu/deploy`)
- 전체 매장 통합 리포트 조회
- 어드민 레이아웃 상단에서 **매장 전환** 가능

### STORE_ADMIN

- 본인 매장(`storeId`) 데이터에만 접근 가능
- 메뉴, 테이블, 주문, 쿠폰, 리뷰 관리
- 매장 전환 불가

---

## 멀티테넌트: X-Store-Id 헤더

모든 API 요청에는 `Authorization`과 `X-Store-Id` 헤더가 자동으로 주입됩니다.

```
Authorization: Bearer <jwt-token>
X-Store-Id: <currentStoreId>
```

`authStore`의 `currentStoreId` 값이 변경되면 이후 모든 요청에 자동으로 반영됩니다.

### 매장 전환 (SUPER_ADMIN 전용)

`AdminLayout` 상단의 드롭다운에서 매장을 선택하면 `authStore.setCurrentStoreId()`가 호출되어 `X-Store-Id` 값이 갱신됩니다. 이후 페이지의 모든 데이터가 선택한 매장 기준으로 조회됩니다.

---

## 인증 흐름

```
POST /api/auth/login
  → JWT 발급 (payload: { sub, username, role, storeId })
  → authStore에 저장
  → LocalStorage에 persist

이후 요청:
  Authorization: Bearer <token>
  X-Store-Id: <currentStoreId>
```

`authStore`의 `isSuperAdmin` getter로 역할을 확인하여 조건부 UI를 렌더링합니다.
