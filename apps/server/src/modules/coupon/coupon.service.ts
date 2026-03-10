import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CouponEntity } from './entities/coupon.entity';
import {
  CreateCouponDto,
  CouponValidationResult,
} from '@qr-order/shared-types';

@Injectable()
export class CouponService {
  constructor(
    @InjectRepository(CouponEntity)
    private readonly couponRepository: Repository<CouponEntity>,
  ) {}

  async findAll(storeId: string): Promise<CouponEntity[]> {
    return this.couponRepository.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(storeId: string, dto: CreateCouponDto): Promise<CouponEntity> {
    // 동일 매장 내 코드 중복 확인
    const existing = await this.couponRepository.findOne({
      where: { storeId, code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`쿠폰 코드 '${dto.code}'가 이미 존재합니다.`);
    }

    const coupon = this.couponRepository.create({
      storeId,
      code: dto.code.toUpperCase(),
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minOrderAmount: dto.minOrderAmount ?? 0,
      maxUses: dto.maxUses ?? 0,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
    return this.couponRepository.save(coupon);
  }

  async deactivate(storeId: string, id: string): Promise<void> {
    const coupon = await this.couponRepository.findOne({ where: { id, storeId } });
    if (!coupon) throw new NotFoundException('쿠폰을 찾을 수 없습니다.');
    coupon.isActive = false;
    await this.couponRepository.save(coupon);
  }

  /**
   * 쿠폰 유효성 검증 + 할인 금액 계산
   * @param storeId 매장 ID
   * @param code 쿠폰 코드
   * @param orderAmount 현재 주문 금액
   */
  async validate(
    storeId: string,
    code: string,
    orderAmount: number,
  ): Promise<CouponValidationResult> {
    const coupon = await this.couponRepository.findOne({
      where: { storeId, code: code.toUpperCase(), isActive: true },
    });

    if (!coupon) {
      return { valid: false, message: '유효하지 않은 쿠폰 코드입니다.' };
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { valid: false, message: '만료된 쿠폰입니다.' };
    }

    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, message: '사용 횟수가 초과된 쿠폰입니다.' };
    }

    if (coupon.minOrderAmount > 0 && orderAmount < coupon.minOrderAmount) {
      return {
        valid: false,
        message: `최소 주문 금액 ${coupon.minOrderAmount.toLocaleString()}원 이상 주문 시 사용 가능합니다.`,
      };
    }

    let discountAmount: number;
    if (coupon.discountType === 'PERCENT') {
      discountAmount = Math.floor((orderAmount * coupon.discountValue) / 100);
    } else {
      discountAmount = Math.min(coupon.discountValue, orderAmount);
    }

    return {
      valid: true,
      couponId: coupon.id,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      finalAmount: orderAmount - discountAmount,
    };
  }

  /**
   * 쿠폰 사용 처리 (주문 생성 시 호출)
   */
  async markUsed(couponId: string): Promise<void> {
    await this.couponRepository.increment({ id: couponId }, 'usedCount', 1);
  }
}
