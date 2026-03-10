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
import { CreateReviewDto } from '@qr-order/shared-types';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

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
   * 어드민: 전체 리뷰 목록 조회
   * GET /api/reviews
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '전체 리뷰 조회 (어드민)' })
  findAll(@CurrentStoreId() storeId: string) {
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
