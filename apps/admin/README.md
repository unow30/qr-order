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
| 드래그앤드롭 | @dnd-kit/core, @dnd-kit/sortable |

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
# docker로 실행
pnpm dev:admin

# 또는 apps/admin 디렉토리에서
pnpm dev
```

### 빌드

```bash
pnpm build
```

> 서버(`apps/server`)가 `localhost:3000`에서 실행 중이어야 합니다.
> 또는 서버(`apps/server`)가 docker에서 실행 중이어야 합니다.

---

## 기본 로그인 정보

| 항목 | 값             |
|------|---------------|
| 아이디 | `admin`       |
| 비밀번호 | `****`        |
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
│   ├── TableManagePage.tsx         # 테이블 관리 + 활성 세션 확인/강제 종료
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
│   ├── table.api.ts                # 테이블 CRUD + 세션 관리
│   ├── coupon.api.ts               # 쿠폰 CRUD
│   ├── review.api.ts               # 리뷰 조회
│   ├── report.api.ts               # 리포트 조회
│   └── image.api.ts                # 이미지 presigned URL 요청/삭제
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
| `/tables` | TableManagePage | 테이블 편집 + 세션 관리 | 어드민 |
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
- 이미지 업로드 및 관리

### STORE_ADMIN

- 본인 매장(`storeId`) 데이터에만 접근 가능
- 메뉴, 테이블, 주문, 쿠폰, 리뷰 관리
- 이미지 업로드 및 관리
- 메뉴 카테고리/항목 드래그앤드롭 순서 변경
- 테이블별 활성 세션 확인 및 강제 종료
- 매장 전환 불가

---

## 이미지 업로드 (S3)

메뉴 항목·카테고리·쿠폰 이미지는 S3 Presigned URL 방식으로 업로드합니다.

```
1. POST /api/images/presigned-url  →  S3 presigned URL + imageUrl 반환
2. 클라이언트에서 presigned URL로 직접 S3에 PUT 업로드
3. 반환된 imageUrl을 메뉴/쿠폰 항목에 저장
```

스케줄 이미지는 `startAt` / `endAt`으로 시간대별 이미지 교체가 가능하며, Redis 캐시 TTL은 다음 상태 변경 시점까지 동적으로 계산됩니다.

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

---

## nginx 구성

어드민 앱은 **2계층 nginx** 구조로 서빙됩니다.

### Layer 1 — 엣지 리버스 프록시 ([nginx/nginx.frontend.conf](../../nginx/nginx.frontend.conf))

인프라 레벨에서 외부 요청을 수신해 내부 컨테이너로 라우팅합니다.

- `admin.qr-order-demo.it.kr` → `admin:80` 업스트림으로 프록시 전달
- `/health-check` 엔드포인트 자체 응답
- 업스트림 장애(502/503/504) 시 fallback HTML 반환

### Layer 2 — SPA 서빙 ([apps/admin/nginx.conf](./nginx.conf))

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

## 개발 단계

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | 멀티테넌트 기반 (Store/Admin 엔티티, StoreContextMiddleware, RolesGuard, RLS) | ✅ 완료 |
| Phase 2 | 어드민 프론트엔드 (역할별 접근, 매장 전환 UI) | ✅ 완료 |
| Phase 3 | 프랜차이즈 기능 (메뉴 템플릿 배포, 통합 리포트, PostgreSQL RLS) | ✅ 완료 |
| Phase 4 | 세션 관리 (PIN 참여, 자리이동, 관리자 세션 강제 종료) | ✅ 완료 |
| Phase 5 | 이미지 업로드 S3 (presigned URL, 스케줄 이미지, 동적 TTL 캐시) | ✅ 완료 |
| Phase 6 | Admin-readonly (읽기 권한 전용 어드민) | ✅ 완료 |
