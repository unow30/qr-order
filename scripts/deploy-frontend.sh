#!/usr/bin/env bash
# deploy-frontend.sh
# Web, Admin 이미지를 병렬로 빌드하여 ECR에 push하고 EC2에 배포합니다.
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
echo " 프론트엔드 배포 시작"
echo " SHA: $GIT_SHA"
echo "========================================"

# ── 1. .env.production 생성 ─────────────────────────────────
echo ""
echo "=== [1/6] .env.production 생성 ==="
echo "VITE_API_BASE_URL=$VITE_API_BASE_URL" > "$PROJECT_ROOT/apps/web/.env.production"
echo "VITE_API_BASE_URL=$VITE_API_BASE_URL" > "$PROJECT_ROOT/apps/admin/.env.production"
echo "완료"

# ── 2. ECR 로그인 ────────────────────────────────────────────
echo ""
echo "=== [2/6] ECR 로그인 ==="
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"
echo "완료"

# ── 3. web + admin 이미지 병렬 빌드 ─────────────────────────
echo ""
echo "=== [3/6] web + admin 이미지 병렬 빌드 ==="

docker build \
  -f "$PROJECT_ROOT/apps/web/Dockerfile" \
  -t "$ECR_REGISTRY/$WEB_IMAGE_NAME:latest" \
  -t "$ECR_REGISTRY/$WEB_IMAGE_NAME:$GIT_SHA" \
  "$PROJECT_ROOT" &
WEB_BUILD_PID=$!

docker build \
  -f "$PROJECT_ROOT/apps/admin/Dockerfile" \
  -t "$ECR_REGISTRY/$ADMIN_IMAGE_NAME:latest" \
  -t "$ECR_REGISTRY/$ADMIN_IMAGE_NAME:$GIT_SHA" \
  "$PROJECT_ROOT" &
ADMIN_BUILD_PID=$!

echo "  web 빌드 PID: $WEB_BUILD_PID"
echo "  admin 빌드 PID: $ADMIN_BUILD_PID"

# 두 빌드 완료 대기
if ! wait $WEB_BUILD_PID; then
  echo "오류: web 이미지 빌드 실패"
  wait $ADMIN_BUILD_PID || true
  exit 1
fi
if ! wait $ADMIN_BUILD_PID; then
  echo "오류: admin 이미지 빌드 실패"
  exit 1
fi
echo "완료"

# ── 4. ECR push ─────────────────────────────────────────────
echo ""
echo "=== [4/6] ECR push ==="
docker push "$ECR_REGISTRY/$WEB_IMAGE_NAME:latest" &
WEB_PUSH_PID=$!
docker push "$ECR_REGISTRY/$ADMIN_IMAGE_NAME:latest" &
ADMIN_PUSH_PID=$!

wait $WEB_PUSH_PID
wait $ADMIN_PUSH_PID
echo "완료"

# ── 5. compose 파일 전송 ─────────────────────────────────────
echo ""
echo "=== [5/6] compose 파일 전송 ==="

ssh -i "$FRONTEND_EC2_SSH_KEY_PATH" \
    "$FRONTEND_EC2_USER@$FRONTEND_EC2_HOST" \
    "sudo mkdir -p /var/www/qr-order/nginx && sudo chown -R \$USER:\$USER /var/www/qr-order"

scp -i "$FRONTEND_EC2_SSH_KEY_PATH" \
    "$PROJECT_ROOT/docker-compose.frontend.yml" \
    "$FRONTEND_EC2_USER@$FRONTEND_EC2_HOST:/var/www/qr-order/"

scp -i "$FRONTEND_EC2_SSH_KEY_PATH" \
    "$PROJECT_ROOT/nginx/nginx.frontend.conf" \
    "$FRONTEND_EC2_USER@$FRONTEND_EC2_HOST:/var/www/qr-order/nginx/"
echo "완료"

# ── 6. EC2 배포 ─────────────────────────────────────────────
echo ""
echo "=== [6/6] EC2 배포 ==="
ssh -i "$FRONTEND_EC2_SSH_KEY_PATH" \
    "$FRONTEND_EC2_USER@$FRONTEND_EC2_HOST" \
    "bash -s" <<REMOTE
set -e

# ECR 로그인
aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin $ECR_REGISTRY

# 최신 이미지 pull
docker pull $ECR_REGISTRY/$WEB_IMAGE_NAME:latest
docker pull $ECR_REGISTRY/$ADMIN_IMAGE_NAME:latest

# compose 재시작
cd /var/www/qr-order
ECR_REGISTRY=$ECR_REGISTRY \
docker-compose -f docker-compose.frontend.yml up -d --no-build --force-recreate

echo "=== docker ps ==="
docker ps -a

# 오래된 이미지 정리
docker image prune -f
REMOTE

echo ""
echo "========================================"
echo " 프론트엔드 배포 완료!"
echo "========================================"
