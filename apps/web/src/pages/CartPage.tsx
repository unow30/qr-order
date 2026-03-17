import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCart, removeCartItem } from '../api/cart.api';
import { validateCoupon, CouponValidationResult } from '../api/coupon.api';
import { useCartStore } from '../stores/cartStore';
import { useCouponStore } from '../stores/couponStore';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, totalAmount, setCart } = useCartStore();
  const { couponCode, setCoupon, clearCoupon, discountAmount, finalAmount } = useCouponStore();

  const [couponInput, setCouponInput] = useState(couponCode ?? '');
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

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

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 32, fontFamily: 'sans-serif', textAlign: 'center' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>←</button>
          <h2 style={{ margin: 0 }}>장바구니</h2>
        </header>
        <p style={{ color: '#888' }}>장바구니가 비어 있습니다.</p>
        <button onClick={() => navigate('/menu')} style={{ marginTop: 16, padding: '12px 24px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          메뉴 보기
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: 'sans-serif', paddingBottom: 100 }}>
      <header style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>←</button>
        <h2 style={{ margin: 0 }}>장바구니</h2>
      </header>

      <div style={{ padding: '0 16px' }}>
        {items.map((item) => (
          <div key={item.cartItemId} style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{item.menuItemName}</p>
                {item.selectedOptions.map((opt) => (
                  <p key={opt.optionId} style={{ margin: '0 0 2px', fontSize: 12, color: '#888' }}>
                    {opt.optionName} {opt.additionalPrice > 0 && `(+${opt.additionalPrice.toLocaleString()}원)`}
                  </p>
                ))}
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
                  {item.quantity}개 · {item.totalPrice.toLocaleString()}원
                </p>
              </div>
              <button
                onClick={() => handleRemove(item.cartItemId)}
                style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 20 }}
              >
                ×
              </button>
            </div>
          </div>
        ))}

        {/* 쿠폰 입력 */}
        <div style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
          <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 14 }}>쿠폰 할인</p>
          {discountAmount > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac' }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#166534', fontFamily: 'monospace' }}>{couponCode}</span>
                <span style={{ fontSize: 13, color: '#166534', marginLeft: 8 }}>— {discountAmount.toLocaleString()}원 할인</span>
              </div>
              <button onClick={handleRemoveCoupon} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="쿠폰 코드 입력"
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                style={{ flex: 1, padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'monospace' }}
              />
              <button
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponInput.trim()}
                style={{ padding: '9px 16px', background: '#333', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, opacity: couponLoading ? 0.6 : 1 }}
              >
                {couponLoading ? '...' : '적용'}
              </button>
            </div>
          )}
          {couponResult && !couponResult.valid && (
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#dc2626' }}>{couponResult.message}</p>
          )}
        </div>

        {/* 금액 합계 */}
        <div style={{ padding: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#555', marginBottom: 8 }}>
            <span>주문 금액</span>
            <span>{totalAmount.toLocaleString()}원</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#059669', marginBottom: 8 }}>
              <span>쿠폰 할인</span>
              <span>-{discountAmount.toLocaleString()}원</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
            <span>결제 금액</span>
            <span>{payAmount.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 440 }}>
        <button
          onClick={() => navigate('/payment', { replace: true })}
          style={{ width: '100%', padding: 16, background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, cursor: 'pointer' }}
        >
          {payAmount.toLocaleString()}원 결제하기
        </button>
      </div>
    </div>
  );
}
