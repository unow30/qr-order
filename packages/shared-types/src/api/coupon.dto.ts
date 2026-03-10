import { DiscountType } from '../entities/coupon.types';

export interface CreateCouponDto {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  expiresAt?: string;
}

export interface ApplyCouponDto {
  code: string;
}

export interface CouponValidationResult {
  valid: boolean;
  couponId?: string;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount?: number;   // 실제 할인 금액
  finalAmount?: number;      // 할인 후 최종 금액
  message?: string;
}
