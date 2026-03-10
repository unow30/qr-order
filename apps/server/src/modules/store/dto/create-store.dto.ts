import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty({ example: '강남점' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'gangnam', description: '영문 소문자, 숫자, 하이픈만 허용' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug는 영문 소문자, 숫자, 하이픈만 사용 가능합니다.' })
  slug: string;
}
