import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCart, removeCartItem } from '../api/cart.api';
import { validateCoupon, CouponValidationResult } from '../api/coupon.api';
import { createOrder } from '../api/order.api';
import { useCartStore } from '../stores/cartStore';
import { useCouponStore } from '../stores/couponStore';
import { useOrderStore } from '../stores/orderStore';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, totalAmount, setCart, clearCart } = useCartStore();
  const { couponCode, setCoupon, clearCoupon, discountAmount, finalAmount } = useCouponStore();
  const setOrder = useOrderStore((s) => s.setOrder);

  const [couponInput, setCouponInput] = useState(couponCode ?? '');
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [note, setNote] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);

  useEffect(() => {
    getCart().then(setCart);
  }, []);

  const handleRemove = async (cartItemId: string) => {
    const cart = await removeCartItem(cartItemId);
    setCart(cart);
    // 상품 변경 시 쿠폰 초기화
    clearCoupon();
    setCouponResult(null);
    setCouponInput('');
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const result = await validateCoupon(couponInput.trim(), totalAmount);
      setCouponResult(result);
      if (result.valid && result.discountAmount !== undefined && result.finalAmount !== undefined) {
        setCoupon(couponInput.trim().toUpperCase(), result.discountAmount, result.finalAmount);
      }
    } catch {
      setCouponResult({ valid: false, message: '쿠폰 검증 중 오류가 발생했습니다.' });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    clearCoupon();
    setCouponResult(null);
    setCouponInput('');
  };

  const payAmount = discountAmount > 0 ? finalAmount : totalAmount;

  const handleOrder = async () => {
    if (items.length === 0) return;
    setOrderLoading(true);
    try {
      const order = await createOrder({
        note: note || undefined,
        couponCode: couponCode ?? undefined,
      });
      setOrder(order);
      clearCart();
      clearCoupon();
      navigate('/menu', { replace: true });
    } catch {
      alert('주문 처리 중 오류가 발생했습니다.');
    } finally {
      setOrderLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-[480px] mx-auto p-8 font-sans text-center">
        <header className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="bg-transparent border-none text-xl cursor-pointer">←</button>
          <h2 className="m-0">장바구니</h2>
        </header>
        <p className="text-gray-400">장바구니가 비어 있습니다.</p>
        <button onClick={() => navigate('/menu')} className="mt-4 px-6 py-3 bg-[#ff6b35] text-white border-none rounded-lg cursor-pointer">
          메뉴 보기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[480px] mx-auto font-sans pb-24">
      <header className="p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="bg-transparent border-none text-xl cursor-pointer">←</button>
        <h2 className="m-0">장바구니</h2>
      </header>

      <div className="px-4">
        {items.map((item) => (
          <div key={item.cartItemId} className="py-4 border-b border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="mb-1 font-semibold">{item.menuItemName}</p>
                {item.selectedOptions.map((opt) => (
                  <p key={opt.optionId} className="mb-0.5 text-xs text-gray-400">
                    {opt.optionName} {opt.additionalPrice > 0 && `(+${opt.additionalPrice.toLocaleString()}원)`}
                  </p>
                ))}
                <p className="mt-1 text-[13px] text-gray-500">
                  {item.quantity}개 · {item.totalPrice.toLocaleString()}원
                </p>
              </div>
              <button
                onClick={() => handleRemove(item.cartItemId)}
                className="bg-transparent border-none text-gray-300 cursor-pointer text-xl"
              >
                ×
              </button>
            </div>
          </div>
        ))}

        {/* 쿠폰 입력 */}
        <div className="py-4 border-b border-gray-100">
          <p className="mb-2 font-semibold text-sm">쿠폰 할인</p>
          {discountAmount > 0 ? (
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-green-50 rounded-lg border border-green-300">
              <div>
                <span className="text-sm font-semibold text-green-800 font-mono">{couponCode}</span>
                <span className="text-[13px] text-green-800 ml-2">— {discountAmount.toLocaleString()}원 할인</span>
              </div>
              <button onClick={handleRemoveCoupon} className="bg-transparent border-none text-gray-400 cursor-pointer text-lg">×</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="쿠폰 코드 입력"
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponInput.trim()}
                className={`px-4 py-2 bg-gray-800 text-white border-none rounded-lg cursor-pointer text-sm ${couponLoading ? 'opacity-60' : ''}`}
              >
                {couponLoading ? '...' : '적용'}
              </button>
            </div>
          )}
          {couponResult && !couponResult.valid && (
            <p className="mt-1.5 text-[13px] text-red-600">{couponResult.message}</p>
          )}
        </div>

        {/* 요청사항 */}
        <div className="py-4 border-b border-gray-100">
          <p className="mb-2 font-semibold text-sm">요청사항</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="주문 요청사항을 입력해 주세요."
            className="w-full p-3 rounded-lg border border-gray-200 text-sm resize-none box-border"
            rows={3}
          />
        </div>

        {/* 금액 합계 */}
        <div className="py-4">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>주문 금액</span>
            <span>{totalAmount.toLocaleString()}원</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600 mb-2">
              <span>쿠폰 할인</span>
              <span>-{discountAmount.toLocaleString()}원</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base">
            <span>결제 금액</span>
            <span>{payAmount.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-[440px]">
        <button
          onClick={handleOrder}
          disabled={orderLoading}
          className={`w-full p-4 bg-[#ff6b35] text-white border-none rounded-xl text-base cursor-pointer ${orderLoading ? 'opacity-70' : ''}`}
        >
          {orderLoading ? '주문 중...' : `${payAmount.toLocaleString()}원 주문하기`}
        </button>
      </div>
    </div>
  );
}
