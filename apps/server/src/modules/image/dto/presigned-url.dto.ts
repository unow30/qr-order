import { IsString, IsNumber, IsIn, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PresignedUrlRequestDto {
  @ApiProperty({ description: '원본 파일명' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'MIME 타입', example: 'image/jpeg' })
  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  contentType: string;

  @ApiProperty({ description: '파일 크기 (바이트)' })
  @IsNumber()
  @Min(1)
  @Max(5 * 1024 * 1024)
  contentLength: number;

  @ApiProperty({
    description: '엔티티 타입',
    enum: ['stores', 'tables', 'menu-categories', 'menu-items', 'coupons', 'reviews'],
  })
  @IsString()
  @IsIn(['stores', 'tables', 'menu-categories', 'menu-items', 'coupons', 'reviews'])
  entityType: string;
}
