import client from '@web/api/client';

export interface CouponValidationResult {
  valid: boolean;
  couponId?: string;
  discountType?: 'PERCENT' | 'FIXED';
  discountValue?: number;
  discountAmount?: number;
  finalAmount?: number;
  message?: string;
}

export const validateCoupon = (
  code: string,
  amount: number,
): Promise<CouponValidationResult> =>
  client.post(`/coupons/validate?amount=${amount}`, { code });
