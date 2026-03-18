import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMenu } from '@web/api/menu.api';
import { getCart } from '@web/api/cart.api';
import { useCartStore } from '@web/stores/cartStore';
import { useSessionStore } from '@web/stores/sessionStore';
import { useOrderStore } from '@web/stores/orderStore';
import { MenuCategory, MenuItem } from '@qr-order/shared-types';

export default function MenuPage() {
  const navigate = useNavigate();
  const setCart = useCartStore((s) => s.setCart);
  const cartItems = useCartStore((s) => s.items);
  const totalAmount = useCartStore((s) => s.totalAmount);
  const tableName = useSessionStore((s) => s.tableName);
  const hasOrders = useOrderStore((s) => s.orders.length > 0);
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

  if (loading) return <div className="p-4">메뉴를 불러오는 중...</div>;

  return (
    <div className="max-w-[480px] mx-auto font-sans">
      <header className="p-4 bg-white border-b border-gray-200 sticky top-0">
        <h1 className="m-0 text-lg">{tableName ?? '테이블'}</h1>
      </header>

      {/* 카테고리 탭 */}
      <nav className="flex overflow-x-auto px-4 py-2 gap-2 bg-white border-b border-gray-200">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full border whitespace-nowrap cursor-pointer ${activeCategory === cat.id ? 'border-[#ff6b35] bg-[#ff6b35] text-white' : 'border-gray-200 bg-white text-gray-800'}`}
          >
            {cat.name}
          </button>
        ))}
      </nav>

      {/* 메뉴 리스트 */}
      <div className="p-4">
        {activeItems.map((item) => (
          <MenuItemCard key={item.id} item={item} onClick={() => navigate(`/menu/${item.id}`)} />
        ))}
      </div>

      {/* 플로팅 버튼 영역 */}
      {(hasOrders || cartItems.length > 0) && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-[440px] flex flex-col gap-2">
          {hasOrders && (
            <button
              onClick={() => navigate('/order-history')}
              className="w-full p-4 bg-gray-800 text-white border-none rounded-xl text-base cursor-pointer"
            >
              주문내역 보기
            </button>
          )}
          {cartItems.length > 0 && (
            <button
              onClick={() => navigate('/cart')}
              className="w-full p-4 bg-[#ff6b35] text-white border-none rounded-xl text-base cursor-pointer"
            >
              장바구니 {cartItems.length}개 · {totalAmount.toLocaleString()}원 보기
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItemCard({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex justify-between items-center py-4 border-b border-gray-100 cursor-pointer"
    >
      <div className="flex-1">
        <p className="mb-1 font-semibold">{item.name}</p>
        {item.description && <p className="mb-1 text-[13px] text-gray-400">{item.description}</p>}
        <p className="m-0 text-[#ff6b35] font-semibold">{item.price.toLocaleString()}원</p>
      </div>
      {item.imageUrl && (
        <img src={item.imageUrl} alt={item.name} className="w-20 h-20 object-cover rounded-lg ml-3" />
      )}
    </div>
  );
}
