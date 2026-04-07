import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const PRESIGN_EXPIRES_IN = 300; // 5분

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly keyPrefix: string;
  private readonly cloudfrontDomain: string;

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      region: config.get<string>('AWS_REGION', 'ap-northeast-2'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('S3_AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('S3_AWS_SECRET_ACCESS_KEY'),
      },
    });

    this.bucket = config.getOrThrow<string>('S3_BUCKET_NAME').trim();

    // NODE_ENV에 따라 업로드 경로 prefix 결정 (production | development)
    const nodeEnv = config.get<string>('NODE_ENV', 'development');
    this.keyPrefix = nodeEnv === 'production' ? 'production' : 'development';

    this.cloudfrontDomain = config.getOrThrow<string>('CLOUDFRONT_DOMAIN');
  }

  async generatePresignedUrl(params: {
    storeId: string;
    entityType: string;
    fileName: string;
    contentType: string;
    contentLength: number;
  }): Promise<{ presignedUrl: string; imageUrl: string; key: string }> {
    if (!ALLOWED_MIME_TYPES.includes(params.contentType)) {
      throw new BadRequestException(
        `지원하지 않는 파일 형식입니다. 허용: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (params.contentLength > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `파일 크기가 ${MAX_FILE_SIZE / 1024 / 1024}MB를 초과합니다.`,
      );
    }

    const ext = this.extractExtension(params.fileName, params.contentType);
    const segments = [this.keyPrefix, params.storeId, params.entityType, `${uuidv4()}.${ext}`]
      .filter(Boolean);
    const key = segments.join('/');

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: params.contentType,
      ContentLength: params.contentLength,
    });

    try {
      const presignedUrl = await getSignedUrl(this.s3, command, {
        expiresIn: PRESIGN_EXPIRES_IN,
      });

      const domain = this.cloudfrontDomain.replace(/\/+$/, '');
      const imageUrl = `${domain}/${key}`;

      return { presignedUrl, imageUrl, key };
    } catch (err) {
      this.logger.error('Presigned URL 생성 실패', err);
      throw new InternalServerErrorException(
        'S3 업로드 URL 생성에 실패했습니다. 서버 설정을 확인하세요.',
      );
    }
  }

  private extractExtension(fileName: string, contentType: string): string {
    const fromName = fileName.split('.').pop()?.toLowerCase();
    if (fromName && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fromName)) {
      return fromName;
    }
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return map[contentType] ?? 'jpg';
  }
}
