import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewEntity } from '@server/modules/review/entities/review.entity';
import { CreateReviewDto } from '@qr-order/shared-types';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewRepository: Repository<ReviewEntity>,
  ) {}

  async create(
    storeId: string,
    sessionToken: string,
    dto: CreateReviewDto,
  ): Promise<ReviewEntity> {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('평점은 1~5 사이여야 합니다.');
    }

    // 동일 주문 + 동일 메뉴 중복 리뷰 방지
    const existing = await this.reviewRepository.findOne({
      where: { orderId: dto.orderId, menuItemId: dto.menuItemId, sessionToken },
    });
    if (existing) {
      throw new BadRequestException('이미 리뷰를 작성하셨습니다.');
    }

    const review = this.reviewRepository.create({
      storeId,
      sessionToken,
      orderId: dto.orderId,
      menuItemId: dto.menuItemId,
      menuItemName: dto.menuItemName,
      rating: dto.rating,
      comment: dto.comment,
    });

    return this.reviewRepository.save(review);
  }

  async findAll(storeId: string | null): Promise<ReviewEntity[]> {
    return this.reviewRepository.find({
      where: storeId ? { storeId } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findByMenuItem(storeId: string, menuItemId: string): Promise<ReviewEntity[]> {
    return this.reviewRepository.find({
      where: { storeId, menuItemId, isVisible: true },
      order: { createdAt: 'DESC' },
    });
  }

  async toggleVisibility(storeId: string, id: string): Promise<ReviewEntity> {
    const review = await this.reviewRepository.findOne({ where: { id, storeId } });
    if (!review) throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    review.isVisible = !review.isVisible;
    return this.reviewRepository.save(review);
  }

  async deleteReview(storeId: string, id: string): Promise<void> {
    const review = await this.reviewRepository.findOne({ where: { id, storeId } });
    if (!review) throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    await this.reviewRepository.remove(review);
  }

  /** 매장 평균 평점 */
  async getAverageRating(storeId: string): Promise<{ averageRating: number; totalReviews: number }> {
    const reviews = await this.reviewRepository.find({
      where: { storeId, isVisible: true },
      select: ['rating'],
    });
    const totalReviews = reviews.length;
    const averageRating = totalReviews
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10
      : 0;
    return { averageRating, totalReviews };
  }
}
