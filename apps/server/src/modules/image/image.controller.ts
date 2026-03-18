import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ImageService, ScheduledEntityType } from '@server/modules/image/image.service';
import { JwtAuthGuard } from '@server/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@server/common/guards/roles.guard';
import { CurrentStoreId } from '@server/common/decorators/current-store-id.decorator';
import { CreateImageDto } from '@server/modules/image/dto/create-image.dto';
import { UpdateImageDto } from '@server/modules/image/dto/update-image.dto';

@ApiTags('images')
@Controller('images')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  // ─── 공개 API ─────────────────────────────────────────────────────────────

  @Get(':entityType/:entityId/active')
  @ApiOperation({ summary: '현재 활성 이미지 조회 (캐시 적용, 공개)' })
  getActive(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    if (!this.imageService.isScheduledEntityType(entityType)) {
      throw new BadRequestException(`지원하지 않는 entityType: ${entityType}`);
    }
    return this.imageService.getActive(entityType, entityId);
  }

  @Get('reviews/:reviewId')
  @ApiOperation({ summary: '리뷰 이미지 조회 (공개)' })
  getReviewImages(@Param('reviewId') reviewId: string) {
    return this.imageService.getReviewImages(reviewId);
  }

  // ─── 어드민 API ───────────────────────────────────────────────────────────

  @Get(':entityType/:entityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '이미지 전체 목록 조회 (관리용)' })
  getAll(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    if (!this.imageService.isScheduledEntityType(entityType)) {
      throw new BadRequestException(`지원하지 않는 entityType: ${entityType}`);
    }
    return this.imageService.getAll(entityType, entityId);
  }

  @Post(':entityType/:entityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '이미지 추가' })
  create(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentStoreId() storeId: string,
    @Body() dto: CreateImageDto,
  ) {
    if (!this.imageService.isScheduledEntityType(entityType)) {
      throw new BadRequestException(`지원하지 않는 entityType: ${entityType}`);
    }
    return this.imageService.create(entityType, entityId, storeId, dto);
  }

  @Put(':entityType/:entityId/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '이미지 수정' })
  update(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('imageId') imageId: string,
    @Body() dto: UpdateImageDto,
  ) {
    if (!this.imageService.isScheduledEntityType(entityType)) {
      throw new BadRequestException(`지원하지 않는 entityType: ${entityType}`);
    }
    return this.imageService.update(entityType, entityId, imageId, dto);
  }

  @Delete(':entityType/:entityId/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '이미지 삭제' })
  async remove(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('imageId') imageId: string,
  ) {
    if (!this.imageService.isScheduledEntityType(entityType)) {
      throw new BadRequestException(`지원하지 않는 entityType: ${entityType}`);
    }
    await this.imageService.remove(entityType, entityId, imageId);
    return { message: '삭제되었습니다.' };
  }
}
