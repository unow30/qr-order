# QR Order

QR 코드 기반 테이블 오더 서비스 모노레포입니다.

## 앱 구성

| 앱 | 설명 | 포트 | README |
|----|------|------|--------|
| `apps/server` | NestJS REST API 백엔드 | 3000 | [바로가기](./apps/server/README.md) |
| `apps/web` | 고객용 모바일 웹앱 | 3001 | [바로가기](./apps/web/README.md) |
| `apps/admin` | 어드민 대시보드 | 3002 | [바로가기](./apps/admin/README.md) |

## 빠른 시작

```bash
# 의존성 설치
pnpm install

# DB 및 Redis 시작 (Docker)
pnpm db:up

# 전체 개발 서버 실행
pnpm dev
```

## 주요 명령어

```bash
pnpm dev             # 전체 앱 동시 실행
pnpm dev:server      # 서버만 실행
pnpm dev:web         # 고객 앱만 실행
pnpm dev:admin       # 어드민만 실행
pnpm build           # 전체 빌드
pnpm db:up           # Docker DB/Redis 시작
pnpm db:down         # Docker DB/Redis 중지
pnpm db:reset        # DB 초기화 및 재시작
pnpm type-check      # 타입 체크
pnpm lint            # 린트 검사
pnpm test            # 테스트 실행
```

## 패키지 구성

| 패키지 | 설명 |
|--------|------|
| `packages/shared-types` | 앱 간 공유 타입 및 DTO |
| `packages/tsconfig` | 공유 TypeScript 설정 |
| `packages/eslint-config` | 공유 ESLint 설정 |

## 기술 스택

| 구분 | 기술 |
|------|------|
| **Backend** | NestJS 10, TypeORM, PostgreSQL 16, Redis 7 |
| **인증** | JWT + Passport.js |
| **실시간** | SSE (Server-Sent Events) |
| **Frontend** | React 18, Vite, Zustand, React Router v6 |
| **모노레포** | pnpm + Turborepo |
| **인프라** | Docker Compose |

## 아키텍처

```
고객 플로우
  QR 코드 스캔
    → /entry (세션 생성)
    → /menu (메뉴 조회)
    → /cart (장바구니)
    → /payment (결제)
    → /order-status (SSE 실시간 주문 추적)

어드민 플로우
  /login (JWT 발급)
    → /dashboard
    → /orders  (주문 관리 · SSE)
    → /menu    (메뉴 편집 · 드래그앤드롭)
    → /tables  (테이블 · QR 생성)
    → /kds     (주방 디스플레이)
    → /reports (매출 리포트)
    → /stores  (매장/어드민 관리 · SUPER_ADMIN 전용)
```

## 멀티테넌트 구현 현황

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | JWT 역할 분리(SUPER_ADMIN/STORE_ADMIN), X-Store-Id 헤더, Redis 키 네임스페이스, PostgreSQL RLS | 완료 |
| Phase 2 | 어드민 프론트엔드 — 매장 전환 UI, 역할 기반 네비게이션 | 완료 |
| Phase 3 | 메뉴 템플릿 배포(F6), 통합 매출 리포트(F7), RLS 정책 적용(F8) | 완료 |
