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
  const storeName = useSessionStore((s) => s.storeName);
  const pin = useSessionStore((s) => s.pin);
  const hasOrders = useOrderStore((s) => s.orders.length > 0);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinDismissed, setPinDismissed] = useState(false);

  useEffect(() => {
    let done = 0;
    const finish = () => {
      if (++done === 2) setLoading(false);
    };

    getMenu()
      .then((menu) => {
        setCategories(menu);
        if (menu.length > 0) setActiveCategory(menu[0].id);
      })
      .catch(() => {})
      .finally(finish);

    getCart()
      .then((cart) => setCart(cart))
      .catch(() => {})
      .finally(finish);
  }, []);

  const activeItems = categories.find((c) => c.id === activeCategory)?.items ?? [];

  if (loading) return <div className="p-4">메뉴를 불러오는 중...</div>;

  return (
    <div className="max-w-[480px] mx-auto font-sans">
      <header className="p-4 bg-white border-b border-gray-200 sticky top-0">
        {storeName && (
          <p className="m-0 mb-0.5 text-xs text-gray-500 font-medium">{storeName}</p>
        )}
        <h1 className="m-0 text-lg">{tableName ?? '테이블'}</h1>
      </header>

      {/* PIN 배너 — 세션 생성자에게만 표시 */}
      {pin && !pinDismissed && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#fff3ee] border-b border-[#ff6b35]/20">
          <span className="text-sm text-gray-700">
            테이블 PIN: <strong className="text-[#ff6b35] tracking-widest">{pin}</strong>
            <span className="text-gray-500 ml-1">(동행자에게 공유하세요)</span>
          </span>
          <button
            onClick={() => setPinDismissed(true)}
            className="text-gray-400 hover:text-gray-600 ml-2 text-lg leading-none"
          >
            &times;
          </button>
        </div>
      )}

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

      {/* 하단 버튼 영역 */}
      {(hasOrders || cartItems.length > 0) && (
        <div className="px-4 pb-6 flex flex-col gap-2">
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
  const thumb = item.images?.[0]?.imageUrl ?? item.imageUrl;
  const thumbAlt = item.images?.[0]?.altText ?? item.name;
  return (
    <div
      onClick={onClick}
      className="flex justify-between items-center py-4 border-b border-gray-100 cursor-pointer"
    >
      <div className="flex-1">
        <p className="mb-1 font-semibold">{item.name}</p>
        {item.description && <p className="mb-1 text-[13px] text-gray-400">{item.description}</p>}
        <p className="m-0 text-brand font-semibold">{item.price.toLocaleString()}원</p>
      </div>
      {thumb && (
        <img src={thumb} alt={thumbAlt} className="w-20 h-20 object-cover rounded-lg ml-3" />
      )}
    </div>
  );
}
