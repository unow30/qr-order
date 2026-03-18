import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMenu } from '@web/api/menu.api';
import { addCartItem } from '@web/api/cart.api';
import { useCartStore } from '@web/stores/cartStore';
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

  if (!item) return <div className="p-4">메뉴를 불러오는 중...</div>;

  return (
    <div className="max-w-[480px] mx-auto font-sans pb-24">
      <header className="p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="bg-none border-none text-xl cursor-pointer">←</button>
        <h2 className="m-0 text-lg">{item.name}</h2>
      </header>

      {item.imageUrl && (
        <img src={item.imageUrl} alt={item.name} className="w-full h-60 object-cover" />
      )}

      <div className="p-4">
        <h2 className="mb-2">{item.name}</h2>
        {item.description && <p className="text-gray-500 mb-2">{item.description}</p>}
        <p className="text-xl font-bold text-[#ff6b35]">{item.price.toLocaleString()}원</p>

        {/* 옵션 그룹 */}
        {item.optionGroups?.map((group) => {
          const isInvalid = invalidGroupIds.has(group.id);
          const selectedCount = selectedOptions.filter((o) => o.optionGroupId === group.id).length;

          return (
            <div
              key={group.id}
              ref={(el) => { groupRefs.current[group.id] = el; }}
              className={`mt-6 rounded-lg transition-all duration-200 ${isInvalid ? 'border-[1.5px] border-red-600 p-3' : 'border-[1.5px] border-transparent p-0'}`}
            >
              {/* 그룹 헤더 */}
              <div className="flex items-center gap-2 mb-3">
                <h3 className="m-0 text-[15px]">{group.name}</h3>
                {group.isRequired && (
                  <span className={`text-[11px] font-semibold text-white rounded px-1.5 py-0.5 transition-colors duration-200 ${isInvalid ? 'bg-red-600' : 'bg-[#ff6b35]'}`}>
                    필수
                  </span>
                )}
                {group.isRequired && (
                  <span className="text-xs text-gray-400 ml-auto">
                    {selectedCount}/{group.maxSelect} 선택
                  </span>
                )}
              </div>

              {/* 미충족 에러 메시지 */}
              {isInvalid && (
                <p className="mb-2.5 text-xs text-red-600 font-medium">
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
                    className={`flex justify-between items-center py-3 border-b border-gray-100 ${option.isAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* 라디오(maxSelect=1) / 체크박스 인디케이터 */}
                      <span
                        className={`w-5 h-5 flex items-center justify-center shrink-0 border-2 transition-all duration-150 ${group.maxSelect === 1 ? 'rounded-full' : 'rounded'} ${isSelected ? 'border-[#ff6b35] bg-[#ff6b35]' : 'border-gray-300 bg-transparent'}`}
                      >
                        {isSelected && <span className="text-white text-xs leading-none">✓</span>}
                      </span>
                      <span className={isSelected ? 'text-[#ff6b35]' : 'text-gray-800'}>{option.name}</span>
                    </div>
                    <span className={`text-sm ${isSelected ? 'text-[#ff6b35]' : 'text-gray-400'}`}>
                      {option.additionalPrice > 0 && `+${option.additionalPrice.toLocaleString()}원`}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* 수량 */}
        <div className="flex items-center gap-4 mt-6">
          <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-9 h-9 rounded-full border border-gray-200 text-xl cursor-pointer">-</button>
          <span className="text-lg font-semibold">{quantity}</span>
          <button onClick={() => setQuantity((q) => q + 1)} className="w-9 h-9 rounded-full border border-gray-200 text-xl cursor-pointer">+</button>
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-[440px]">
        <button
          onClick={handleAddToCart}
          disabled={loading}
          className={`w-full p-4 bg-[#ff6b35] text-white border-none rounded-xl text-base cursor-pointer ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {totalPrice.toLocaleString()}원 · 장바구니 담기
        </button>
      </div>
    </div>
  );
}
