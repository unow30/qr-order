import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMenu } from '../api/menu.api';
import { addCartItem } from '../api/cart.api';
import { useCartStore } from '../stores/cartStore';
import { MenuItem, MenuOptionGroup, SelectedOption } from '@qr-order/shared-types';

export default function MenuDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setCart = useCartStore((s) => s.setCart);
  const [item, setItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMenu().then((categories) => {
      const found = categories.flatMap((c) => c.items).find((i) => i.id === id);
      setItem(found ?? null);
    });
  }, [id]);

  const handleOptionToggle = (group: MenuOptionGroup, optionId: string) => {
    const option = group.options.find((o) => o.id === optionId);
    if (!option) return;

    setSelectedOptions((prev) => {
      const existing = prev.find((o) => o.optionGroupId === group.id && o.optionId === optionId);
      if (existing) {
        return prev.filter((o) => !(o.optionGroupId === group.id && o.optionId === optionId));
      }
      const grouped = prev.filter((o) => o.optionGroupId === group.id);
      if (grouped.length >= group.maxSelect) {
        // 단일 선택: 기존 제거 후 추가
        const filtered = prev.filter((o) => o.optionGroupId !== group.id);
        return [...filtered, {
          optionGroupId: group.id,
          optionGroupName: group.name,
          optionId: option.id,
          optionName: option.name,
          additionalPrice: option.additionalPrice,
        }];
      }
      return [...prev, {
        optionGroupId: group.id,
        optionGroupName: group.name,
        optionId: option.id,
        optionName: option.name,
        additionalPrice: option.additionalPrice,
      }];
    });
  };

  const totalPrice = item
    ? (item.price + selectedOptions.reduce((s, o) => s + o.additionalPrice, 0)) * quantity
    : 0;

  const handleAddToCart = async () => {
    if (!item || !id) return;
    setLoading(true);
    try {
      const cart = await addCartItem({ menuItemId: id, quantity, selectedOptions });
      setCart(cart);
      navigate('/menu');
    } finally {
      setLoading(false);
    }
  };

  if (!item) return <div style={{ padding: 16 }}>메뉴를 불러오는 중...</div>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: 'sans-serif', paddingBottom: 100 }}>
      <header style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>←</button>
        <h2 style={{ margin: 0, fontSize: 18 }}>{item.name}</h2>
      </header>

      {item.imageUrl && (
        <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: 240, objectFit: 'cover' }} />
      )}

      <div style={{ padding: 16 }}>
        <h2 style={{ margin: '0 0 8px' }}>{item.name}</h2>
        {item.description && <p style={{ color: '#666', marginBottom: 8 }}>{item.description}</p>}
        <p style={{ fontSize: 20, fontWeight: 700, color: '#ff6b35' }}>{item.price.toLocaleString()}원</p>

        {/* 옵션 그룹 */}
        {item.optionGroups?.map((group) => (
          <div key={group.id} style={{ marginTop: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>
              {group.name} {group.isRequired && <span style={{ color: '#e53935', fontSize: 12 }}>필수</span>}
            </h3>
            {group.options.map((option) => {
              const isSelected = selectedOptions.some(
                (o) => o.optionGroupId === group.id && o.optionId === option.id,
              );
              return (
                <div
                  key={option.id}
                  onClick={() => handleOptionToggle(group, option.id)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', padding: '12px 0',
                    borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
                    color: isSelected ? '#ff6b35' : '#333',
                  }}
                >
                  <span>{option.name}</span>
                  <span>
                    {option.additionalPrice > 0 && `+${option.additionalPrice.toLocaleString()}원`}
                    {isSelected && ' ✓'}
                  </span>
                </div>
              );
            })}
          </div>
        ))}

        {/* 수량 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
          <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #ddd', fontSize: 20, cursor: 'pointer' }}>-</button>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{quantity}</span>
          <button onClick={() => setQuantity((q) => q + 1)} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #ddd', fontSize: 20, cursor: 'pointer' }}>+</button>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 440 }}>
        <button
          onClick={handleAddToCart}
          disabled={loading}
          style={{ width: '100%', padding: 16, background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, cursor: 'pointer' }}
        >
          {totalPrice.toLocaleString()}원 · 장바구니 담기
        </button>
      </div>
    </div>
  );
}
