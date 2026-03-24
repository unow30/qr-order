# GitHub Actions → ECR → EC2 프론트엔드 배포 가이드

## 전체 흐름

```
main 브랜치 push
  → GitHub Actions: Docker 빌드 (ubuntu-latest)
  → ECR: web, admin 이미지 push
  → EC2 (SSH): docker pull → docker compose up
```

---

## 1단계: AWS 준비

### ECR 레포지토리 생성

```bash
aws ecr create-repository --repository-name qr-order-web --region ap-northeast-2
aws ecr create-repository --repository-name qr-order-admin --region ap-northeast-2
```

### IAM 사용자 생성 (GitHub Actions용)

**필요 권한 (최소 권한 원칙):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 2단계: GitHub Secrets 설정

GitHub 레포 → Settings → Secrets and variables → Actions에서 추가:

| Secret 이름 | 값 |
|------------|-----|
| `AWS_ACCESS_KEY_ID` | IAM 사용자 액세스 키 |
| `AWS_SECRET_ACCESS_KEY` | IAM 사용자 시크릿 키 |
| `AWS_ACCOUNT_ID` | AWS 계정 ID (12자리 숫자) |
| `FRONTEND_EC2_HOST` | EC2 퍼블릭 IP 또는 도메인 |
| `FRONTEND_EC2_USER` | EC2 접속 유저 (`ec2-user` 또는 `ubuntu`) |
| `FRONTEND_EC2_SSH_KEY` | EC2 .pem 파일 내용 (전체) |

---

## 3단계: EC2 초기 설정

EC2에 처음 접속 후 한 번만 실행:

```bash
# Docker 설치 (Amazon Linux 2023 기준)
sudo yum update -y
sudo yum install -y docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# Docker Compose v1 설치 (EC2에서 docker-compose 명령어 사용)
# 주의: Amazon Linux 2023 기본 Docker는 'docker compose' (v2 플러그인)가 없을 수 있음
# 워크플로우에서 docker-compose (v1) 명령어를 사용하므로 아래 설치 필요
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 버전 확인
docker-compose version

# AWS CLI 설치
sudo yum install -y awscli

# EC2에 ECR 접근 권한 부여 (IAM 역할 방식 권장)
# EC2 인스턴스에 ECR 읽기 권한이 있는 IAM 역할 연결

# 프로젝트 디렉토리 생성
mkdir -p ~/qr-order/nginx

# nginx 설정 파일 복사 (첫 배포 시 직접 업로드)
scp -i path/to/pemkey \ path/to/nginx/nginx.frontend.conf \ ec2-user@<EC2-IP>:/var/www/qr-order/nginx/
```

### EC2 IAM 역할 설정 (필수)

> **주의:** IAM 사용자/그룹에 ECR 권한을 줘도 EC2 내부에서는 동작하지 않습니다.
> IAM 사용자 권한은 "GitHub Actions가 AWS API를 호출하는 권한"이고,
> EC2 IAM Role은 "EC2 서버 자체가 AWS API를 호출하는 권한"으로 별개입니다.

**1단계: IAM Role 생성**
```
AWS 콘솔 → IAM → 역할 → 역할 생성
→ 신뢰할 엔터티: AWS 서비스 → EC2
→ 권한 추가: AmazonEC2ContainerRegistryReadOnly
→ 역할 이름: ec2-ecr-readonly-role
→ 생성
```

**2단계: EC2 인스턴스에 역할 연결**
```
AWS 콘솔 → EC2 → 인스턴스 선택
→ 작업(Actions) → 보안(Security) → IAM 역할 수정
→ ec2-ecr-readonly-role 선택 → 저장
```

재시작 없이 즉시 적용됩니다. 이후 EC2에서 `aws ecr get-login-password`가 자동으로 인증됩니다.

---

## 4단계: EC2에 .env 파일 설정

```bash
# EC2에서 환경 변수 파일 생성
cat > ~/qr-order/.env << 'EOF'
ECR_REGISTRY=<AWS_ACCOUNT_ID>.dkr.ecr.ap-northeast-2.amazonaws.com
EOF
```

---

## 5단계: 첫 배포 확인

GitHub main 브랜치에 push하면 자동 실행됩니다.

### 배포 트리거 조건 (paths 필터)
```
apps/web/**
apps/admin/**
packages/shared-types/**
nginx/nginx.frontend.conf
docker-compose.frontend.yml
```

---

## 6단계: EC2에서 상태 확인

```bash
# 컨테이너 상태
docker compose -f ~/qr-order/docker-compose.frontend.yml ps

# nginx 로그
docker logs qr-order-nginx

# web 로그
docker logs qr-order-web

# health check
curl http://localhost/health-check
```

---

## 파일 구조

```
.github/
└── workflows/
    └── deploy-frontend.yml   ← GitHub Actions workflow

docker-compose.frontend.yml   ← ECR 이미지 사용 (ECR_REGISTRY 환경변수)
nginx/
└── nginx.frontend.conf       ← EC2에도 동일 파일 필요
```

---

## 롤백 방법

특정 커밋으로 롤백할 경우:

```bash
# EC2에서 직접 실행 (커밋 SHA 지정)
COMMIT_SHA=abc1234

docker pull $ECR_REGISTRY/qr-order-web:$COMMIT_SHA
docker pull $ECR_REGISTRY/qr-order-admin:$COMMIT_SHA

# docker-compose.frontend.yml의 :latest를 :$COMMIT_SHA로 변경 후
docker compose -f docker-compose.frontend.yml up -d --no-build --force-recreate
```

---

## 트러블슈팅

### `Unable to locate credentials` 에러

```
Unable to locate credentials. You can configure credentials by running "aws login".
Error response from daemon: no basic auth credentials
```

**원인:** EC2 인스턴스에 IAM Role이 연결되지 않은 상태.
IAM 사용자에 ECR 권한이 있어도 EC2 내부 aws cli는 별도 크레덴셜을 사용합니다.

**해결:** EC2 인스턴스에 IAM Role 연결 (3단계 참고)

---

### `docker-compose exit code: 18` 에러

ECR 인증 실패로 이미지를 pull하지 못한 경우 발생합니다. 위 IAM Role 문제와 동일한 원인입니다.

---

### `docker ps`에 컨테이너가 없는 경우

`docker-compose up`이 실패하면 컨테이너가 생성되지 않습니다.
워크플로우 로그에서 `=== docker-compose exit code ===` 이후를 확인하세요.

---

## 비용 참고

| 항목 | 비용 |
|------|------|
| t3.micro | 약 $0.0104/h (~$7.5/월) |
| ECR 스토리지 | 0.5 GiB 무료, 초과 시 $0.10/GB |
| ECR 데이터 전송 (EC2 동일 리전) | **무료** |

