import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@server/config/redis.config';
import { REDIS_KEYS } from '@server/common/redis/redis-keys';
import { StoreImageEntity } from '@server/modules/image/entities/store-image.entity';
import { TableImageEntity } from '@server/modules/image/entities/table-image.entity';
import { MenuCategoryImageEntity } from '@server/modules/image/entities/menu-category-image.entity';
import { MenuItemImageEntity } from '@server/modules/image/entities/menu-item-image.entity';
import { CouponImageEntity } from '@server/modules/image/entities/coupon-image.entity';
import { ReviewImageEntity } from '@server/modules/image/entities/review-image.entity';
import { CreateImageDto } from '@server/modules/image/dto/create-image.dto';
import { UpdateImageDto } from '@server/modules/image/dto/update-image.dto';

type ScheduledImageEntity =
  | StoreImageEntity
  | TableImageEntity
  | MenuCategoryImageEntity
  | MenuItemImageEntity
  | CouponImageEntity;

type ScheduledImageRepo =
  | Repository<StoreImageEntity>
  | Repository<TableImageEntity>
  | Repository<MenuCategoryImageEntity>
  | Repository<MenuItemImageEntity>
  | Repository<CouponImageEntity>;

export type ScheduledEntityType =
  | 'stores'
  | 'tables'
  | 'menu-categories'
  | 'menu-items'
  | 'coupons';

@Injectable()
export class ImageService {
  constructor(
    @InjectRepository(StoreImageEntity)
    private readonly storeImageRepo: Repository<StoreImageEntity>,
    @InjectRepository(TableImageEntity)
    private readonly tableImageRepo: Repository<TableImageEntity>,
    @InjectRepository(MenuCategoryImageEntity)
    private readonly menuCategoryImageRepo: Repository<MenuCategoryImageEntity>,
    @InjectRepository(MenuItemImageEntity)
    private readonly menuItemImageRepo: Repository<MenuItemImageEntity>,
    @InjectRepository(CouponImageEntity)
    private readonly couponImageRepo: Repository<CouponImageEntity>,
    @InjectRepository(ReviewImageEntity)
    private readonly reviewImageRepo: Repository<ReviewImageEntity>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  // ─── 레포지토리 선택 ───────────────────────────────────────────────────────

  private getRepo(entityType: ScheduledEntityType): ScheduledImageRepo {
    switch (entityType) {
      case 'stores':
        return this.storeImageRepo;
      case 'tables':
        return this.tableImageRepo;
      case 'menu-categories':
        return this.menuCategoryImageRepo;
      case 'menu-items':
        return this.menuItemImageRepo;
      case 'coupons':
        return this.couponImageRepo;
    }
  }

  private getEntityIdColumn(entityType: ScheduledEntityType): string {
    switch (entityType) {
      case 'stores':
        return 'storeId';
      case 'tables':
        return 'tableId';
      case 'menu-categories':
        return 'categoryId';
      case 'menu-items':
        return 'itemId';
      case 'coupons':
        return 'couponId';
    }
  }

  // ─── Redis 캐시 ───────────────────────────────────────────────────────────

  private getCacheKey(entityType: string, entityId: string): string {
    return REDIS_KEYS.image.key(entityType, entityId);
  }

  /**
   * 다음 상태 변경 시점까지의 TTL(초) 계산.
   * 영구 이미지만 있으면 24시간, 이벤트 이미지가 있으면 가장 가까운 변경 시점까지.
   */
  private calcTTL(images: ScheduledImageEntity[]): number {
    const now = Date.now();
    const futureTimes = (images as Array<{ startAt?: Date | null; endAt?: Date | null }>)
      .flatMap((img) => [img.startAt?.getTime(), img.endAt?.getTime()])
      .filter((t): t is number => !!t && t > now)
      .sort((a, b) => a - b);

    if (futureTimes.length === 0) return 86400; // 24h
    return Math.max(Math.floor((futureTimes[0] - now) / 1000), 1);
  }

  private async invalidateCache(entityType: string, entityId: string): Promise<void> {
    await this.redis.del(this.getCacheKey(entityType, entityId));
  }

  // ─── 현재 활성 이미지 쿼리 ────────────────────────────────────────────────

  private async queryActiveImages(
    repo: ScheduledImageRepo,
    entityIdColumn: string,
    entityId: string,
  ): Promise<ScheduledImageEntity[]> {
    const now = new Date();
    const baseWhere = { [entityIdColumn]: entityId, isActive: true };

    return (repo as Repository<ScheduledImageEntity>).find({
      where: [
        { ...baseWhere, startAt: IsNull(), endAt: IsNull() },
        { ...baseWhere, startAt: LessThanOrEqual(now), endAt: IsNull() },
        { ...baseWhere, startAt: IsNull(), endAt: MoreThanOrEqual(now) },
        { ...baseWhere, startAt: LessThanOrEqual(now), endAt: MoreThanOrEqual(now) },
      ],
      order: { priority: 'DESC', sortOrder: 'ASC' } as any,
    });
  }

  // ─── 스케줄 이미지 CRUD ───────────────────────────────────────────────────

  async getAll(entityType: ScheduledEntityType, entityId: string): Promise<ScheduledImageEntity[]> {
    const repo = this.getRepo(entityType);
    const col = this.getEntityIdColumn(entityType);
    return (repo as Repository<ScheduledImageEntity>).find({
      where: { [col]: entityId } as any,
      order: { priority: 'DESC', sortOrder: 'ASC' } as any,
    });
  }

  async getActive(entityType: ScheduledEntityType, entityId: string): Promise<ScheduledImageEntity[]> {
    const cacheKey = this.getCacheKey(entityType, entityId);
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const repo = this.getRepo(entityType);
    const col = this.getEntityIdColumn(entityType);
    const images = await this.queryActiveImages(repo, col, entityId);

    const ttl = this.calcTTL(images);
    await this.redis.setex(cacheKey, ttl, JSON.stringify(images));
    return images;
  }

  async create(
    entityType: ScheduledEntityType,
    entityId: string,
    storeId: string,
    dto: CreateImageDto,
  ): Promise<ScheduledImageEntity> {
    const repo = this.getRepo(entityType);
    const col = this.getEntityIdColumn(entityType);

    const image = (repo as Repository<ScheduledImageEntity>).create({
      [col]: entityId,
      storeId,
      imageUrl: dto.imageUrl,
      altText: dto.altText ?? null,
      sortOrder: dto.sortOrder ?? 0,
      priority: dto.priority ?? 0,
      startAt: dto.startAt ? new Date(dto.startAt) : null,
      endAt: dto.endAt ? new Date(dto.endAt) : null,
    } as any);

    const saved = await (repo as Repository<ScheduledImageEntity>).save(image) as unknown as ScheduledImageEntity;
    await this.invalidateCache(entityType, entityId);
    return saved;
  }

  async update(
    entityType: ScheduledEntityType,
    entityId: string,
    imageId: string,
    dto: UpdateImageDto,
  ): Promise<ScheduledImageEntity> {
    const repo = this.getRepo(entityType) as Repository<ScheduledImageEntity>;
    const image = await repo.findOne({ where: { id: imageId } as any });
    if (!image) throw new NotFoundException('이미지를 찾을 수 없습니다.');

    Object.assign(image, {
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      ...(dto.altText !== undefined && { altText: dto.altText }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.startAt !== undefined && { startAt: dto.startAt ? new Date(dto.startAt) : null }),
      ...(dto.endAt !== undefined && { endAt: dto.endAt ? new Date(dto.endAt) : null }),
    });

    const saved = await repo.save(image);
    await this.invalidateCache(entityType, entityId);
    return saved;
  }

  async remove(
    entityType: ScheduledEntityType,
    entityId: string,
    imageId: string,
  ): Promise<void> {
    const repo = this.getRepo(entityType) as Repository<ScheduledImageEntity>;
    const image = await repo.findOne({ where: { id: imageId } as any });
    if (!image) throw new NotFoundException('이미지를 찾을 수 없습니다.');

    await repo.remove(image);
    await this.invalidateCache(entityType, entityId);
  }

  // ─── 리뷰 이미지 ─────────────────────────────────────────────────────────

  async getReviewImages(reviewId: string): Promise<ReviewImageEntity[]> {
    return this.reviewImageRepo.find({
      where: { reviewId },
      order: { sortOrder: 'ASC' },
    });
  }

  async createReviewImage(
    reviewId: string,
    storeId: string,
    imageUrl: string,
  ): Promise<ReviewImageEntity> {
    const existing = await this.reviewImageRepo.find({ where: { reviewId } });
    const image = this.reviewImageRepo.create({
      reviewId,
      storeId,
      imageUrl,
      sortOrder: existing.length,
    });
    return this.reviewImageRepo.save(image);
  }

  async removeReviewImage(reviewId: string, imageId: string): Promise<void> {
    const image = await this.reviewImageRepo.findOne({
      where: { id: imageId, reviewId },
    });
    if (!image) throw new NotFoundException('이미지를 찾을 수 없습니다.');
    await this.reviewImageRepo.remove(image);
  }

  // ─── 마이그레이션 헬퍼 ───────────────────────────────────────────────────

  async migrateFromUrl(
    entityType: ScheduledEntityType,
    entityId: string,
    storeId: string,
    imageUrl: string,
  ): Promise<void> {
    const repo = this.getRepo(entityType) as Repository<ScheduledImageEntity>;
    const col = this.getEntityIdColumn(entityType);

    const exists = await repo.findOne({
      where: { [col]: entityId, imageUrl } as any,
    });
    if (exists) return;

    await this.create(entityType, entityId, storeId, { imageUrl });
  }

  isScheduledEntityType(entityType: string): entityType is ScheduledEntityType {
    return ['stores', 'tables', 'menu-categories', 'menu-items', 'coupons'].includes(entityType);
  }
}
