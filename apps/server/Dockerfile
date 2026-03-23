# ─── Stage 1: 의존성 설치 ───────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# pnpm 워크스페이스 설정 복사
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# 각 패키지의 package.json만 먼저 복사 (레이어 캐싱 활용)
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/server/package.json ./apps/server/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: 빌드 ──────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# 설치된 node_modules 복사
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules

# 소스 복사
COPY packages/tsconfig ./packages/tsconfig
COPY packages/shared-types ./packages/shared-types
COPY apps/server ./apps/server
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./

# shared-types 빌드 후 server 빌드
RUN pnpm --filter @qr-order/shared-types build
RUN pnpm --filter @qr-order/server build

# ─── Stage 3: 프로덕션 이미지 ────────────────────────────────────────
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

ENV NODE_ENV=production

# 프로덕션 의존성만 설치
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/server/package.json ./apps/server/

RUN pnpm install --frozen-lockfile --prod

# 빌드 결과물 복사
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist

EXPOSE 3000

CMD ["node", "apps/server/dist/main"]
