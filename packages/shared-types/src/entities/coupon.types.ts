export type DiscountType = 'PERCENT' | 'FIXED';

export interface Coupon {
  id: string;
  storeId: string;
  code: string;            // 쿠폰 코드 (예: SUMMER20)
  discountType: DiscountType;
  discountValue: number;   // PERCENT: 1~100, FIXED: 금액(원)
  minOrderAmount: number;  // 최소 주문 금액 (0이면 무제한)
  maxUses: number;         // 최대 사용 횟수 (0이면 무제한)
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}
