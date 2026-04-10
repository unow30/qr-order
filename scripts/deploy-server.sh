#!/usr/bin/env bash
# deploy-server.sh
# NestJS 서버 이미지를 빌드하여 ECR에 push하고 EC2에 배포합니다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 환경변수 로드
if [ ! -f "$SCRIPT_DIR/.env.deploy" ]; then
  echo "오류: $SCRIPT_DIR/.env.deploy 파일이 없습니다."
  echo "  cp scripts/.env.deploy.example scripts/.env.deploy 후 값을 채워주세요."
  exit 1
fi
source "$SCRIPT_DIR/.env.deploy"

GIT_SHA=$(git -C "$PROJECT_ROOT" rev-parse HEAD)

echo "========================================"
echo " 서버 배포 시작"
echo " SHA: $GIT_SHA"
echo "========================================"

# ── 1. .env.production 생성 ─────────────────────────────────
echo ""
echo "=== [1/5] apps/server/.env.production 생성 ==="
cat > "$PROJECT_ROOT/apps/server/.env.production" <<EOF
NODE_ENV=$NODE_ENV
PORT=$PORT
DATABASE_HOST=$DATABASE_HOST
DATABASE_PORT=$DATABASE_PORT
DATABASE_USER=$DATABASE_USER
DATABASE_PASSWORD=$DATABASE_PASSWORD
DATABASE_NAME=$DATABASE_NAME
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=$JWT_EXPIRES_IN
SESSION_TTL_SECONDS=$SESSION_TTL_SECONDS
ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_PASSWORD=$ADMIN_PASSWORD
CORS_ORIGINS=$CORS_ORIGINS
TYPEORM_SYNC=$TYPEORM_SYNC
REDIS_HOST=$REDIS_HOST
REDIS_PORT=$REDIS_PORT
REDIS_TLS=true
DATABASE_SSL=true
S3_AWS_ACCESS_KEY_ID=$S3_AWS_ACCESS_KEY_ID
S3_AWS_SECRET_ACCESS_KEY=$S3_AWS_SECRET_ACCESS_KEY
S3_BUCKET_NAME=$S3_BUCKET_NAME
AWS_REGION=$AWS_REGION
CLOUDFRONT_DOMAIN=$CLOUDFRONT_DOMAIN
EOF
echo "완료"

# ── 2. ECR 로그인 ────────────────────────────────────────────
echo ""
echo "=== [2/5] ECR 로그인 ==="
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"
echo "완료"

# ── 3. Docker 이미지 빌드 ────────────────────────────────────
echo ""
echo "=== [3/5] Docker 이미지 빌드 ==="
docker build \
  -f "$PROJECT_ROOT/apps/server/Dockerfile" \
  -t "$ECR_REGISTRY/$SERVER_IMAGE_NAME:latest" \
  -t "$ECR_REGISTRY/$SERVER_IMAGE_NAME:$GIT_SHA" \
  "$PROJECT_ROOT"
echo "완료"

# ── 4. ECR push ─────────────────────────────────────────────
echo ""
echo "=== [4/5] ECR push ==="
docker push "$ECR_REGISTRY/$SERVER_IMAGE_NAME:latest"
docker push "$ECR_REGISTRY/$SERVER_IMAGE_NAME:$GIT_SHA"
echo "완료"

# ── 5. EC2 배포 ─────────────────────────────────────────────
echo ""
echo "=== [5/5] EC2 배포 ==="

# compose 파일 전송
echo "  → docker-compose.server.yml 전송"
ssh -i "$BACKEND_EC2_SSH_KEY_PATH" \
    "$BACKEND_EC2_USER@$BACKEND_EC2_HOST" \
    "sudo mkdir -p /var/www/qr-order/nginx && sudo chown -R \$USER:\$USER /var/www/qr-order"

scp -i "$BACKEND_EC2_SSH_KEY_PATH" \
    "$PROJECT_ROOT/docker-compose.server.yml" \
    "$BACKEND_EC2_USER@$BACKEND_EC2_HOST:/var/www/qr-order/"

scp -i "$BACKEND_EC2_SSH_KEY_PATH" \
    "$PROJECT_ROOT/nginx/nginx.server.conf" \
    "$BACKEND_EC2_USER@$BACKEND_EC2_HOST:/var/www/qr-order/nginx/"

# .env 파일 전송
echo "  → .env 파일 전송"
ssh -i "$BACKEND_EC2_SSH_KEY_PATH" \
    "$BACKEND_EC2_USER@$BACKEND_EC2_HOST" \
    "mkdir -p /var/www/qr-order/apps/server"

scp -i "$BACKEND_EC2_SSH_KEY_PATH" \
    "$PROJECT_ROOT/apps/server/.env.production" \
    "$BACKEND_EC2_USER@$BACKEND_EC2_HOST:/var/www/qr-order/apps/server/.env"

# SSH로 배포 실행
echo "  → EC2에서 이미지 pull 및 컨테이너 재시작"
ssh -i "$BACKEND_EC2_SSH_KEY_PATH" \
    "$BACKEND_EC2_USER@$BACKEND_EC2_HOST" \
    "bash -s" <<REMOTE
set -e

# ECR 로그인
aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin $ECR_REGISTRY

# 최신 이미지 pull
docker pull $ECR_REGISTRY/$SERVER_IMAGE_NAME:latest

# compose 재시작
cd /var/www/qr-order
ECR_REGISTRY=$ECR_REGISTRY \
docker-compose -f docker-compose.server.yml up -d --no-build --force-recreate

echo "=== docker ps ==="
docker ps -a

# 오래된 이미지 정리
docker image prune -f
REMOTE

echo ""
echo "========================================"
echo " 서버 배포 완료!"
echo "========================================"
