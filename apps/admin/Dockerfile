# ─── Stage 1: 의존성 설치 ───────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/admin/package.json ./apps/admin/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: 빌드 ──────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/apps/admin/node_modules ./apps/admin/node_modules

COPY packages/tsconfig ./packages/tsconfig
COPY packages/shared-types ./packages/shared-types
COPY apps/admin ./apps/admin
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./

ARG VITE_API_BASE_URL

RUN pnpm --filter @qr-order/shared-types build
RUN pnpm --filter @qr-order/admin build

# ─── Stage 3: Nginx로 정적 파일 서빙 ────────────────────────────────
FROM nginx:alpine AS production

COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
