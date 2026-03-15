import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Headers,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentStoreId } from '../../common/decorators/current-store-id.decorator';
import { CreateReviewDto, CreateReviewImageDto } from '@qr-order/shared-types';
import { ImageService } from '../image/image.service';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly imageService: ImageService,
  ) {}

  /**
   * 고객: 리뷰 작성 (JWT 불필요, X-Session-Token 필수)
   * POST /api/reviews
   */
  @Post()
  @ApiOperation({ summary: '리뷰 작성 (고객, X-Session-Token 필수)' })
  @ApiHeader({ name: 'X-Session-Token', required: true })
  createReview(
    @CurrentStoreId() storeId: string,
    @Headers('x-session-token') sessionToken: string,
    @Body() dto: CreateReviewDto,
  ) {
    if (!sessionToken) throw new UnauthorizedException('세션 토큰이 필요합니다.');
    return this.reviewService.create(storeId, sessionToken, dto);
  }

  /**
   * 고객: 리뷰 이미지 업로드 (JWT 불필요, X-Session-Token 필수)
   * POST /api/reviews/:id/images
   */
  @Post(':id/images')
  @ApiOperation({ summary: '리뷰 이미지 추가 (고객, X-Session-Token 필수)' })
  @ApiHeader({ name: 'X-Session-Token', required: true })
  addReviewImage(
    @CurrentStoreId() storeId: string,
    @Param('id') reviewId: string,
    @Headers('x-session-token') sessionToken: string,
    @Body() dto: CreateReviewImageDto,
  ) {
    if (!sessionToken) throw new UnauthorizedException('세션 토큰이 필요합니다.');
    return this.imageService.createReviewImage(reviewId, storeId, dto.imageUrl);
  }

  /**
   * 어드민: 리뷰 이미지 삭제
   * DELETE /api/reviews/:id/images/:imageId
   */
  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '리뷰 이미지 삭제 (어드민)' })
  async removeReviewImage(
    @Param('id') reviewId: string,
    @Param('imageId') imageId: string,
  ) {
    await this.imageService.removeReviewImage(reviewId, imageId);
    return { message: '삭제되었습니다.' };
  }

  /**
   * 어드민: 전체 리뷰 목록 조회
   * GET /api/reviews
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '전체 리뷰 조회 (어드민)' })
  findAll(@CurrentStoreId(false) storeId: string | null) {
    return this.reviewService.findAll(storeId);
  }

  /**
   * 고객: 특정 메뉴 아이템 리뷰 조회 (공개된 것만)
   * GET /api/reviews/items/:menuItemId
   */
  @Get('items/:menuItemId')
  @ApiOperation({ summary: '메뉴 아이템별 리뷰 조회 (공개)' })
  findByMenuItem(
    @CurrentStoreId() storeId: string,
    @Param('menuItemId') menuItemId: string,
  ) {
    return this.reviewService.findByMenuItem(storeId, menuItemId);
  }

  /**
   * 어드민: 리뷰 공개/비공개 토글
   * PUT /api/reviews/:id/visibility
   */
  @Put(':id/visibility')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '리뷰 공개/비공개 토글 (어드민)' })
  toggleVisibility(
    @CurrentStoreId() storeId: string,
    @Param('id') id: string,
  ) {
    return this.reviewService.toggleVisibility(storeId, id);
  }

  /**
   * 어드민: 리뷰 삭제
   * DELETE /api/reviews/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '리뷰 삭제 (어드민)' })
  deleteReview(
    @CurrentStoreId() storeId: string,
    @Param('id') id: string,
  ) {
    return this.reviewService.deleteReview(storeId, id);
  }
}
