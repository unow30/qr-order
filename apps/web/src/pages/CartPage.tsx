import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCart, removeCartItem } from '../api/cart.api';
import { useCartStore } from '../stores/cartStore';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, totalAmount, setCart } = useCartStore();

  useEffect(() => {
    getCart().then(setCart);
  }, []);

  const handleRemove = async (cartItemId: string) => {
    const cart = await removeCartItem(cartItemId);
    setCart(cart);
  };

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

        <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
          <span>합계</span>
          <span>{totalAmount.toLocaleString()}원</span>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 440 }}>
        <button
          onClick={() => navigate('/payment')}
          style={{ width: '100%', padding: 16, background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, cursor: 'pointer' }}
        >
          {totalAmount.toLocaleString()}원 결제하기
        </button>
      </div>
    </div>
  );
}
