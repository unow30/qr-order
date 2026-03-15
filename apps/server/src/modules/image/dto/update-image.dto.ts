import { IsString, IsOptional, IsNumber, IsDateString, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateImageDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ required: false })
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
