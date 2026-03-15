import { IsString, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateImageDto {
  @ApiProperty()
  @IsString()
  imageUrl: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  startAt?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  endAt?: string | null;
}
