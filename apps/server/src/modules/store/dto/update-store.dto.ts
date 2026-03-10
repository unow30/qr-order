import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStoreDto {
  @ApiPropertyOptional({ example: '강남2호점' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
