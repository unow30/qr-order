import { create } from 'zustand';

interface CouponState {
  couponCode: string | null;
  discountAmount: number;
  finalAmount: number;
  setCoupon: (code: string, discountAmount: number, finalAmount: number) => void;
  clearCoupon: () => void;
}

export const useCouponStore = create<CouponState>((set) => ({
  couponCode: null,
  discountAmount: 0,
  finalAmount: 0,
  setCoupon: (code, discountAmount, finalAmount) =>
    set({ couponCode: code, discountAmount, finalAmount }),
  clearCoupon: () => set({ couponCode: null, discountAmount: 0, finalAmount: 0 }),
}));
