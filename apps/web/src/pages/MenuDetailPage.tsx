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

    const failedGroups = (item.optionGroups ?? []).filter(
      (g) => !isGroupSatisfied(g, selectedOptions),
    );

    if (failedGroups.length > 0) {
      setInvalidGroupIds(new Set(failedGroups.map((g) => g.id)));
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

  if (!item) {
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
      <header className="px-4 py-3 bg-white border-b border-zinc-100 sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-zinc-700 text-lg leading-none w-7 h-7 flex items-center justify-center"
        >
          ←
        </button>
        <h1 className="text-base font-extrabold text-zinc-900 tracking-[-0.3px] truncate">
          {item.name}
        </h1>
      </header>

      <ItemImageCarousel item={item} />

      <div className="flex-1 px-4 pt-4 pb-3">
        <h2 className="text-lg font-extrabold text-zinc-900 tracking-[-0.3px] mb-1.5">{item.name}</h2>
        {item.description && (
          <p className="text-[13px] text-zinc-600 leading-relaxed mb-2">{item.description}</p>
        )}
        <p className="text-sm font-extrabold text-zinc-900">{item.price.toLocaleString()}원</p>

        {/* 옵션 그룹 */}
        {item.optionGroups?.map((group) => {
          const isInvalid = invalidGroupIds.has(group.id);
          const selectedCount = selectedOptions.filter((o) => o.optionGroupId === group.id).length;

          return (
            <div
              key={group.id}
              ref={(el) => { groupRefs.current[group.id] = el; }}
              className={`mt-6 rounded-[10px] transition-all duration-200 ${
                isInvalid ? 'border-[1.5px] border-red-600 p-3' : 'border-[1.5px] border-transparent p-0'
              }`}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <h3 className="text-sm font-bold text-zinc-900">{group.name}</h3>
                {group.isRequired && (
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-white tracking-[0.2px] transition-colors ${
                      isInvalid ? 'bg-red-600' : 'bg-brand-500'
                    }`}
                  >
                    필수
                  </span>
                )}
                {group.isRequired && (
                  <span className="text-[11px] text-zinc-400 ml-auto">
                    {selectedCount}/{group.maxSelect} 선택
                  </span>
                )}
              </div>

              {isInvalid && (
                <p className="mb-2 text-[11px] text-red-600 font-medium">
                  필수 옵션을 선택해주세요 ({group.maxSelect}개 선택 필요)
                </p>
              )}

              {group.options.map((option) => {
                const isSelected = selectedOptions.some(
                  (o) => o.optionGroupId === group.id && o.optionId === option.id,
                );
                return (
                  <div
                    key={option.id}
                    onClick={() => option.isAvailable && handleOptionToggle(group, option.id)}
                    className={`flex justify-between items-center py-3 border-b border-zinc-100 ${
                      option.isAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-5 h-5 flex items-center justify-center shrink-0 border-2 transition-all ${
                          group.maxSelect === 1 ? 'rounded-full' : 'rounded'
                        } ${
                          isSelected ? 'border-brand-500 bg-brand-500' : 'border-zinc-300 bg-transparent'
                        }`}
                      >
                        {isSelected && <span className="text-white text-[10px] leading-none">✓</span>}
                      </span>
                      <span className={`text-[13px] ${isSelected ? 'text-brand-700 font-bold' : 'text-zinc-800'}`}>
                        {option.name}
                      </span>
                    </div>
                    <span className={`text-[13px] ${isSelected ? 'text-brand-700' : 'text-zinc-400'}`}>
                      {option.additionalPrice > 0 && `+${option.additionalPrice.toLocaleString()}원`}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* 수량 */}
        <div className="flex items-center gap-3 mt-6">
          <span className="text-sm font-bold text-zinc-900 mr-auto">수량</span>
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-8 h-8 rounded-full border border-zinc-200 text-zinc-700 text-base leading-none"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-bold text-zinc-900">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => q + 1)}
            className="w-8 h-8 rounded-full border border-zinc-200 text-zinc-700 text-base leading-none"
          >
            +
          </button>
        </div>
      </div>

      {/* 하단 sticky CTA */}
      <div className="flex flex-col gap-2 px-3.5 py-3.5 border-t border-zinc-100 bg-white sticky bottom-0">
        <button
          onClick={handleAddToCart}
          disabled={loading}
          className="w-full h-11 rounded-xl bg-brand-500 text-white text-[13px] font-bold tracking-[-0.1px] disabled:opacity-50"
        >
          {loading ? '담는 중...' : `장바구니 담기 · ${totalPrice.toLocaleString()}원`}
        </button>
      </div>
    </div>
  );
}

function ItemImageCarousel({ item }: { item: MenuItem }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = item.images?.length
    ? item.images.map((img) => ({ id: img.id, url: img.imageUrl, alt: img.altText ?? item.name }))
    : item.imageUrl
      ? [{ id: 'legacy', url: item.imageUrl, alt: item.name }]
      : [];

  if (slides.length === 0) return null;

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  const goTo = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="relative bg-zinc-100">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((s) => (
          <img
            key={s.id}
            src={s.url}
            alt={s.alt ?? ''}
            className="snap-center w-full aspect-square object-cover shrink-0"
          />
        ))}
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              aria-label={`${i + 1}번 이미지로 이동`}
              className={`h-1.5 rounded-full transition-all duration-300 pointer-events-auto ${
                i === activeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
