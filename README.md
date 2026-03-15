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
pnpm db:reset        # DB 초기화 및 재시작
pnpm type-check      # 타입 체크
pnpm lint            # 린트 검사
```

## 패키지 구성

| 패키지 | 설명 |
|--------|------|
| `packages/shared-types` | 앱 간 공유 타입 및 DTO |
| `packages/tsconfig` | 공유 TypeScript 설정 |
| `packages/eslint-config` | 공유 ESLint 설정 |
