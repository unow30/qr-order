import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMenu } from '@web/api/menu.api';
import { getCart } from '@web/api/cart.api';
import { getMyOrders } from '@web/api/order.api';
import { useCartStore } from '@web/stores/cartStore';
import { useSessionStore } from '@web/stores/sessionStore';
import { useOrderStore } from '@web/stores/orderStore';
import { MenuCategory, MenuItem, OrderStatus } from '@qr-order/shared-types';

export default function MenuPage() {
  const navigate = useNavigate();
  const setCart = useCartStore((s) => s.setCart);
  const cartItems = useCartStore((s) => s.items);
  const totalAmount = useCartStore((s) => s.totalAmount);
  const tableName = useSessionStore((s) => s.tableName);
  const storeName = useSessionStore((s) => s.storeName);
  const pin = useSessionStore((s) => s.pin);
  const hasOrders = useOrderStore((s) => s.orders.length > 0);
  const orderCount = useOrderStore((s) => s.orders.length);
  const setOrders = useOrderStore((s) => s.setOrders);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinDismissed, setPinDismissed] = useState(false);

  useEffect(() => {
    let done = 0;
    const finish = () => {
      if (++done === 3) setLoading(false);
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

    getMyOrders()
      .then((orders) => {
        setOrders(orders.filter((o) => o.status === OrderStatus.PENDING));
      })
      .catch(() => {})
      .finally(finish);
  }, []);

  const activeItems = categories.find((c) => c.id === activeCategory)?.items ?? [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-5">
        <div
          className="w-11 h-11 rounded-full border-[3px] border-zinc-100 border-t-brand-500"
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <p className="text-[11px] text-zinc-500">메뉴를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* 헤더 */}
      <header className="px-4 py-3 bg-white border-b border-zinc-100 sticky top-0 z-10">
        {storeName && (
          <p className="mb-0.5 text-[10px] font-semibold text-zinc-500 tracking-[0.2px]">{storeName}</p>
        )}
        <h1 className="text-base font-extrabold text-zinc-900 tracking-[-0.3px]">
          {tableName ?? '테이블'}
        </h1>
      </header>

      {/* PIN 배너 */}
      {pin && !pinDismissed && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-brand-50">
          <span className="text-[11px] text-zinc-700">
            PIN{' '}
            <b className="text-brand-700 tracking-[2px] font-mono">
              {pin.slice(0, 3)} {pin.slice(3)}
            </b>
            <span className="text-zinc-500 ml-1.5">일행에게 공유</span>
          </span>
          <button
            onClick={() => setPinDismissed(true)}
            className="text-zinc-400 hover:text-zinc-600 text-base leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* 카테고리 탭 */}
      <nav className="flex overflow-x-auto px-4 py-3 gap-1.5 bg-white border-b border-zinc-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap text-[11px] cursor-pointer shrink-0 border transition-colors ${
                active
                  ? 'bg-zinc-900 border-zinc-900 text-white font-bold'
                  : 'bg-white border-zinc-200 text-zinc-600 font-medium'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </nav>

      {/* 메뉴 리스트 */}
      <div className="flex-1">
        {activeItems.map((item) => (
          <MenuItemCard key={item.id} item={item} onClick={() => navigate(`/menu/${item.id}`)} />
        ))}
      </div>

      {/* 하단 고정 버튼 */}
      {(hasOrders || cartItems.length > 0) && (
        <div className="flex flex-col gap-2 px-3.5 py-3.5 border-t border-zinc-100 bg-white sticky bottom-0">
          {hasOrders && (
            <button
              onClick={() => navigate('/order-history')}
              className="w-full h-10 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold tracking-[-0.1px]"
            >
              주문내역 {orderCount}건 보기
            </button>
          )}
          {cartItems.length > 0 && (
            <div className="relative">
              <button
                onClick={() => navigate('/cart')}
                className="w-full h-11 rounded-xl bg-brand-500 text-white text-[13px] font-bold tracking-[-0.1px]"
              >
                장바구니 {cartItems.length}개 · {totalAmount.toLocaleString()}원
              </button>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center">
                <span className="text-[10px] font-extrabold text-white">{cartItems.length}</span>
              </div>
            </div>
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
      className="flex justify-between items-center gap-3 px-4 py-3.5 border-b border-zinc-100 cursor-pointer active:bg-zinc-50"
    >
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <p className="text-sm font-bold text-zinc-900 truncate">{item.name}</p>
        {item.description && (
          <p className="text-[11px] text-zinc-500 leading-snug line-clamp-2">{item.description}</p>
        )}
        <p className="text-sm font-extrabold text-zinc-900">{item.price.toLocaleString()}원</p>
      </div>
      {thumb ? (
        <img
          src={thumb}
          alt={thumbAlt}
          className="w-[72px] h-[72px] object-cover rounded-[10px] shrink-0"
        />
      ) : (
        <div className="w-[72px] h-[72px] rounded-[10px] bg-zinc-100 shrink-0" />
      )}
    </div>
  );
}
