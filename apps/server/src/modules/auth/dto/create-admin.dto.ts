import { IsString, IsNotEmpty, IsIn, IsOptional, MinLength, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ example: 'gangnam-admin' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'strongPassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: ['SUPER_ADMIN', 'STORE_ADMIN'], example: 'STORE_ADMIN' })
  @IsIn(['SUPER_ADMIN', 'STORE_ADMIN'])
  role: 'SUPER_ADMIN' | 'STORE_ADMIN';

  @ApiPropertyOptional({
    example: ['uuid-of-store-1', 'uuid-of-store-2'],
    description: 'STORE_ADMIN일 경우 필수 (1개 이상)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  storeIds?: string[];
}
