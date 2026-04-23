import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCart, removeCartItem } from '@web/api/cart.api';
import { validateCoupon, CouponValidationResult } from '@web/api/coupon.api';
import { createOrder } from '@web/api/order.api';
import { useCartStore } from '@web/stores/cartStore';
import { useCouponStore } from '@web/stores/couponStore';
import { useOrderStore } from '@web/stores/orderStore';
import { OrderStatus } from '@qr-order/shared-types';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, totalAmount, setCart, clearCart } = useCartStore();
  const { couponCode, setCoupon, clearCoupon, discountAmount, finalAmount } = useCouponStore();
  const addOrder = useOrderStore((s) => s.addOrder);
  const hasPendingOrder = useOrderStore((s) => s.orders.some((o) => o.status === OrderStatus.PENDING));

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
      addOrder(order);
      clearCart();
      clearCoupon();
      navigate('/menu', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '알 수 없는 오류';
      alert(`주문 처리 중 오류: ${msg}`);
    } finally {
      setOrderLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <header className="px-4 py-3 bg-white border-b border-zinc-100 sticky top-0 z-10 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-zinc-700 text-lg leading-none w-7 h-7 flex items-center justify-center"
          >
            ←
          </button>
          <h1 className="text-base font-extrabold text-zinc-900 tracking-[-0.3px]">장바구니</h1>
        </header>
        <div className="flex flex-col items-center justify-center flex-1 gap-2 px-6 text-center">
          <div className="w-12 h-12 rounded-[10px] bg-zinc-100 flex items-center justify-center text-xl">
            🛒
          </div>
          <p className="text-sm font-bold text-zinc-900">장바구니가 비어있어요</p>
          <p className="text-[11px] text-zinc-500">메뉴에서 원하는 항목을 담아보세요</p>
          <button
            onClick={() => navigate('/menu')}
            className="mt-4 px-5 h-11 rounded-xl bg-zinc-900 text-white text-[13px] font-bold tracking-[-0.1px]"
          >
            메뉴 보기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="px-4 py-3 bg-white border-b border-zinc-100 sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-zinc-700 text-lg leading-none w-7 h-7 flex items-center justify-center"
        >
          ←
        </button>
        <h1 className="text-base font-extrabold text-zinc-900 tracking-[-0.3px]">장바구니</h1>
      </header>

      {hasPendingOrder && (
        <div className="px-4 py-2.5 bg-brand-50 text-[11px] text-zinc-700">
          <b className="text-brand-700">기존 주문에 추가</b>
          <span className="text-zinc-500 ml-1.5">결제 시 함께 처리됩니다</span>
        </div>
      )}

      <div className="flex-1">
        {items.map((item) => (
          <div
            key={item.cartItemId}
            className="flex justify-between items-start gap-3 px-4 py-3.5 border-b border-zinc-100"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-900 truncate">{item.menuItemName}</p>
              {item.selectedOptions.map((opt) => (
                <p key={opt.optionId} className="mt-0.5 text-[11px] text-zinc-500">
                  {opt.optionName}
                  {opt.additionalPrice > 0 && ` (+${opt.additionalPrice.toLocaleString()}원)`}
                </p>
              ))}
              <p className="mt-1 text-[11px] text-zinc-500">
                {item.quantity}개 · <span className="text-zinc-900 font-bold">{item.totalPrice.toLocaleString()}원</span>
              </p>
            </div>
            <button
              onClick={() => handleRemove(item.cartItemId)}
              className="text-zinc-400 hover:text-zinc-600 text-base leading-none"
              aria-label="삭제"
            >
              ✕
            </button>
          </div>
        ))}

        {/* 쿠폰 */}
        <div className="px-4 py-4 border-b border-zinc-100">
          <p className="mb-2 text-sm font-bold text-zinc-900">쿠폰 할인</p>
          {discountAmount > 0 ? (
            <div className="flex items-center justify-between px-3 py-2.5 bg-brand-50 rounded-[10px]">
              <div className="text-[13px]">
                <span className="font-bold text-brand-700 font-mono tracking-[1px]">{couponCode}</span>
                <span className="text-zinc-700 ml-2">−{discountAmount.toLocaleString()}원 할인</span>
              </div>
              <button
                onClick={handleRemoveCoupon}
                className="text-zinc-400 hover:text-zinc-600 text-base leading-none"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="쿠폰 코드 입력"
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                className="flex-1 border-2 border-zinc-200 rounded-[10px] focus:border-zinc-900 focus:outline-none bg-white px-3 py-2.5 text-sm font-mono tracking-[1px]"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponInput.trim()}
                className="px-4 h-11 rounded-xl bg-zinc-900 text-white text-[13px] font-bold tracking-[-0.1px] disabled:opacity-50"
              >
                {couponLoading ? '...' : '적용'}
              </button>
            </div>
          )}
          {couponResult && !couponResult.valid && (
            <p className="mt-2 text-[11px] text-red-600">{couponResult.message}</p>
          )}
        </div>

        {/* 요청사항 */}
        <div className="px-4 py-4 border-b border-zinc-100">
          <p className="mb-2 text-sm font-bold text-zinc-900">요청사항</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="주문 요청사항을 입력해 주세요."
            className="w-full border-2 border-zinc-200 rounded-[10px] focus:border-zinc-900 focus:outline-none bg-white px-3 py-2.5 text-sm resize-none"
            rows={3}
          />
        </div>

        {/* 합계 */}
        <div className="px-4 py-4">
          <div className="flex justify-between text-[13px] text-zinc-500 mb-2">
            <span>주문 금액</span>
            <span>{totalAmount.toLocaleString()}원</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-[13px] text-brand-700 mb-2">
              <span>쿠폰 할인</span>
              <span>−{discountAmount.toLocaleString()}원</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
            <span className="text-sm font-bold text-zinc-900">결제 금액</span>
            <span className="text-lg font-extrabold text-zinc-900">{payAmount.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      {/* 하단 sticky CTA */}
      <div className="flex flex-col gap-2 px-3.5 py-3.5 border-t border-zinc-100 bg-white sticky bottom-0">
        <button
          onClick={handleOrder}
          disabled={orderLoading}
          className="w-full h-11 rounded-xl bg-brand-500 text-white text-[13px] font-bold tracking-[-0.1px] disabled:opacity-50"
        >
          {orderLoading ? '주문 중...' : `${payAmount.toLocaleString()}원 주문하기`}
        </button>
      </div>
    </div>
  );
}
