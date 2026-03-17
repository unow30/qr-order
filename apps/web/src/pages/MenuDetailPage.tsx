import { useEffect, useRef, useState } from 'react';
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
  const [invalidGroupIds, setInvalidGroupIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    getMenu().then((categories) => {
      const found = categories.flatMap((c) => c.items).find((i) => i.id === id);
      setItem(found ?? null);
    });
  }, [id]);

  /** isRequired 그룹의 선택 수가 maxSelect를 충족하는지 검사 */
  const isGroupSatisfied = (group: MenuOptionGroup, options: SelectedOption[]) => {
    if (!group.isRequired) return true;
    const count = options.filter((o) => o.optionGroupId === group.id).length;
    return count === group.maxSelect;
  };

  const handleOptionToggle = (group: MenuOptionGroup, optionId: string) => {
    const option = group.options.find((o) => o.id === optionId);
    if (!option) return;

    setSelectedOptions((prev) => {
      let next: SelectedOption[];
      const existing = prev.find(
        (o) => o.optionGroupId === group.id && o.optionId === optionId,
      );

      if (existing) {
        next = prev.filter(
          (o) => !(o.optionGroupId === group.id && o.optionId === optionId),
        );
      } else {
        const grouped = prev.filter((o) => o.optionGroupId === group.id);
        if (grouped.length >= group.maxSelect) {
          // maxSelect 초과 시 가장 오래된 선택 제거 후 추가
          const filtered = prev.filter((o) => o.optionGroupId !== group.id);
          next = [
            ...filtered,
            {
              optionGroupId: group.id,
              optionGroupName: group.name,
              optionId: option.id,
              optionName: option.name,
              additionalPrice: option.additionalPrice,
            },
          ];
        } else {
          next = [
            ...prev,
            {
              optionGroupId: group.id,
              optionGroupName: group.name,
              optionId: option.id,
              optionName: option.name,
              additionalPrice: option.additionalPrice,
            },
          ];
        }
      }

      // 선택 변경 후 해당 그룹이 충족되면 에러 상태 즉시 해제
      if (group.isRequired && isGroupSatisfied(group, next)) {
        setInvalidGroupIds((ids) => {
          const copy = new Set(ids);
          copy.delete(group.id);
          return copy;
        });
      }

      return next;
    });
  };

  const totalPrice = item
    ? (item.price + selectedOptions.reduce((s, o) => s + o.additionalPrice, 0)) * quantity
    : 0;

  const handleAddToCart = async () => {
    if (!item || !id) return;

    // 필수 옵션 그룹 검사
    const failedGroups = (item.optionGroups ?? []).filter(
      (g) => !isGroupSatisfied(g, selectedOptions),
    );

    if (failedGroups.length > 0) {
      setInvalidGroupIds(new Set(failedGroups.map((g) => g.id)));
      // 첫 번째 미충족 그룹으로 스크롤
      groupRefs.current[failedGroups[0].id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

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
        {item.optionGroups?.map((group) => {
          const isInvalid = invalidGroupIds.has(group.id);
          const selectedCount = selectedOptions.filter((o) => o.optionGroupId === group.id).length;

          return (
            <div
              key={group.id}
              ref={(el) => { groupRefs.current[group.id] = el; }}
              style={{
                marginTop: 24,
                borderRadius: 8,
                border: `1.5px solid ${isInvalid ? '#e53935' : 'transparent'}`,
                padding: isInvalid ? '12px' : '0',
                transition: 'border-color 0.2s, padding 0.2s',
              }}
            >
              {/* 그룹 헤더 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>{group.name}</h3>
                {group.isRequired && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#fff',
                      background: isInvalid ? '#e53935' : '#ff6b35',
                      borderRadius: 4,
                      padding: '2px 6px',
                      transition: 'background 0.2s',
                    }}
                  >
                    필수
                  </span>
                )}
                {group.isRequired && (
                  <span style={{ fontSize: 12, color: '#999', marginLeft: 'auto' }}>
                    {selectedCount}/{group.maxSelect} 선택
                  </span>
                )}
              </div>

              {/* 미충족 에러 메시지 */}
              {isInvalid && (
                <p style={{ margin: '0 0 10px', fontSize: 12, color: '#e53935', fontWeight: 500 }}>
                  필수 옵션을 선택해주세요 ({group.maxSelect}개 선택 필요)
                </p>
              )}

              {/* 옵션 목록 */}
              {group.options.map((option) => {
                const isSelected = selectedOptions.some(
                  (o) => o.optionGroupId === group.id && o.optionId === option.id,
                );
                return (
                  <div
                    key={option.id}
                    onClick={() => option.isAvailable && handleOptionToggle(group, option.id)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: option.isAvailable ? 'pointer' : 'not-allowed',
                      opacity: option.isAvailable ? 1 : 0.4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* 라디오(maxSelect=1) / 체크박스 인디케이터 */}
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: group.maxSelect === 1 ? '50%' : 4,
                          border: `2px solid ${isSelected ? '#ff6b35' : '#ddd'}`,
                          background: isSelected ? '#ff6b35' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.15s',
                        }}
                      >
                        {isSelected && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✓</span>}
                      </span>
                      <span style={{ color: isSelected ? '#ff6b35' : '#333' }}>{option.name}</span>
                    </div>
                    <span style={{ fontSize: 14, color: isSelected ? '#ff6b35' : '#888' }}>
                      {option.additionalPrice > 0 && `+${option.additionalPrice.toLocaleString()}원`}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}

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
          style={{
            width: '100%',
            padding: 16,
            background: '#ff6b35',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {totalPrice.toLocaleString()}원 · 장바구니 담기
        </button>
      </div>
    </div>
  );
}
