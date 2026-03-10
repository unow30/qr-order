import client from './client';

export type DiscountType = 'PERCENT' | 'FIXED';

export interface Coupon {
  id: string;
  storeId: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCouponPayload {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  expiresAt?: string;
}

export const getCoupons = (): Promise<Coupon[]> => client.get('/coupons');

export const createCoupon = (data: CreateCouponPayload): Promise<Coupon> =>
  client.post('/coupons', data);

export const deactivateCoupon = (id: string): Promise<void> =>
  client.delete(`/coupons/${id}`);
