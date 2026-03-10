import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMenu } from '../api/menu.api';
import { getCart } from '../api/cart.api';
import { useCartStore } from '../stores/cartStore';
import { useSessionStore } from '../stores/sessionStore';
import { MenuCategory, MenuItem } from '@qr-order/shared-types';

export default function MenuPage() {
  const navigate = useNavigate();
  const setCart = useCartStore((s) => s.setCart);
  const cartItems = useCartStore((s) => s.items);
  const totalAmount = useCartStore((s) => s.totalAmount);
  const tableName = useSessionStore((s) => s.tableName);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMenu(), getCart()])
      .then(([menu, cart]) => {
        setCategories(menu);
        if (menu.length > 0) setActiveCategory(menu[0].id);
        setCart(cart);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeItems = categories.find((c) => c.id === activeCategory)?.items ?? [];

  if (loading) return <div style={{ padding: 16 }}>메뉴를 불러오는 중...</div>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ padding: '16px', background: '#fff', borderBottom: '1px solid #eee', position: 'sticky', top: 0 }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>{tableName ?? '테이블'}</h1>
      </header>

      {/* 카테고리 탭 */}
      <nav style={{ display: 'flex', overflowX: 'auto', padding: '8px 16px', gap: 8, background: '#fff', borderBottom: '1px solid #eee' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: activeCategory === cat.id ? '#ff6b35' : '#ddd',
              background: activeCategory === cat.id ? '#ff6b35' : '#fff',
              color: activeCategory === cat.id ? '#fff' : '#333',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            {cat.name}
          </button>
        ))}
      </nav>

      {/* 메뉴 리스트 */}
      <div style={{ padding: 16 }}>
        {activeItems.map((item) => (
          <MenuItemCard key={item.id} item={item} onClick={() => navigate(`/menu/${item.id}`)} />
        ))}
      </div>

      {/* 장바구니 버튼 */}
      {cartItems.length > 0 && (
        <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 440 }}>
          <button
            onClick={() => navigate('/cart')}
            style={{ width: '100%', padding: 16, background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, cursor: 'pointer' }}
          >
            장바구니 {cartItems.length}개 · {totalAmount.toLocaleString()}원 보기
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItemCard({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{item.name}</p>
        {item.description && <p style={{ margin: '0 0 4px', fontSize: 13, color: '#888' }}>{item.description}</p>}
        <p style={{ margin: 0, color: '#ff6b35', fontWeight: 600 }}>{item.price.toLocaleString()}원</p>
      </div>
      {item.imageUrl && (
        <img src={item.imageUrl} alt={item.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginLeft: 12 }} />
      )}
    </div>
  );
}
