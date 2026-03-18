import { useState, useEffect } from 'react';
import { getCoupons, createCoupon, deactivateCoupon, Coupon, DiscountType } from '@admin/api/coupon.api';
import { useAuthStore } from '@admin/stores/authStore';
import { useStoreNames } from '@admin/hooks/useStoreNames';
import ImageManagerWidget from '@admin/components/ImageManagerWidget';

function statusBadgeCls(c: Coupon): string {
  if (!c.isActive) return 'bg-gray-100 text-gray-500';
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return 'bg-red-100 text-red-600';
  if (c.maxUses > 0 && c.usedCount >= c.maxUses) return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

function statusBadgeLabel(c: Coupon): string {
  if (!c.isActive) return '비활성';
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return '만료';
  if (c.maxUses > 0 && c.usedCount >= c.maxUses) return '소진';
  return '사용 가능';
}

export default function CouponManagePage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentStoreId, isSuperAdmin } = useAuthStore();
  const superAdmin = isSuperAdmin();
  const isAllStores = superAdmin && !currentStoreId;
  const storeNameMap = useStoreNames();

  // 폼 상태
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENT');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [formError, setFormError] = useState('');
  const [imageOpenId, setImageOpenId] = useState<string | null>(null);

  const load = () => getCoupons().then(setCoupons).catch(() => {});

  useEffect(() => { load(); }, [currentStoreId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const val = parseInt(discountValue, 10);
    if (!code.trim() || isNaN(val) || val <= 0) {
      setFormError('코드와 할인 값은 필수입니다.');
      return;
    }
    if (discountType === 'PERCENT' && val > 100) {
      setFormError('비율 할인은 1~100 사이여야 합니다.');
      return;
    }
    setLoading(true);
    try {
      await createCoupon({
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: val,
        minOrderAmount: parseInt(minOrderAmount, 10) || 0,
        maxUses: parseInt(maxUses, 10) || 0,
        expiresAt: expiresAt || undefined,
      });
      setCode(''); setDiscountValue(''); setMinOrderAmount('');
      setMaxUses(''); setExpiresAt('');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? '쿠폰 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    await deactivateCoupon(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="m-0 text-[22px]">쿠폰 관리</h2>
        {superAdmin && (
          <span className={`px-3 py-1 rounded-full text-[13px] font-semibold ${
            isAllStores ? 'bg-[#e8f5e9] text-[#1b5e20]' : 'bg-[#e3f2fd] text-[#0d47a1]'
          }`}>
            {isAllStores ? '전체 매장' : (storeNameMap[currentStoreId!] || '선택된 매장')}
          </span>
        )}
      </div>

      <div className={`grid gap-6 ${isAllStores ? 'grid-cols-1' : 'grid-cols-[380px_1fr]'}`}>

        {/* 쿠폰 생성 폼 (매장 선택 모드에서만) */}
        {!isAllStores && (
          <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <h3 className="mt-0 mb-4 text-base">쿠폰 생성</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-2.5">
              <input
                className="w-full box-border px-3 py-2 border border-[#ddd] rounded-lg text-sm"
                placeholder="쿠폰 코드 (예: SUMMER20)"
                value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required
              />
              <select
                className="w-full box-border px-3 py-2 border border-[#ddd] rounded-lg text-sm"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              >
                <option value="PERCENT">비율 할인 (%)</option>
                <option value="FIXED">정액 할인 (원)</option>
              </select>
              <input
                className="w-full box-border px-3 py-2 border border-[#ddd] rounded-lg text-sm"
                placeholder={discountType === 'PERCENT' ? '할인율 (1~100)' : '할인 금액 (원)'}
                type="number" min="1" value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)} required
              />
              <input
                className="w-full box-border px-3 py-2 border border-[#ddd] rounded-lg text-sm"
                placeholder="최소 주문 금액 (0 = 무제한)"
                type="number" min="0" value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
              />
              <input
                className="w-full box-border px-3 py-2 border border-[#ddd] rounded-lg text-sm"
                placeholder="최대 사용 횟수 (0 = 무제한)"
                type="number" min="0" value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
              <div>
                <label className="text-xs text-[#555] block mb-1">만료일 (선택)</label>
                <input
                  className="w-full box-border px-3 py-2 border border-[#ddd] rounded-lg text-sm"
                  type="date" value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              {formError && <p className="text-[#e53935] text-[13px] m-0">{formError}</p>}
              <button
                type="submit" disabled={loading}
                className={`px-4 py-2 bg-[#ff6b35] text-white border-none rounded-lg cursor-pointer text-sm ${loading ? 'opacity-60' : ''}`}
              >
                쿠폰 생성
              </button>
            </form>
          </div>
        )}

        {/* 쿠폰 목록 */}
        <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          {isAllStores && (
            <div className="bg-[#fff8e1] border border-[#ffe082] rounded-lg px-4 py-3 mb-4 text-[#795548] text-[13px]">
              전체 보기 모드입니다. 쿠폰을 생성하려면 상단에서 매장을 선택해주세요.
            </div>
          )}
          <h3 className="mt-0 mb-4 text-base">쿠폰 목록 ({coupons.length}개)</h3>
          {coupons.length === 0 ? (
            <p className="text-[#999] text-sm">등록된 쿠폰이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {coupons.map((c) => (
                <div key={c.id} className="bg-[#fafafa] rounded-lg border border-[#eee] overflow-hidden">
                  <div className="px-4 py-3.5 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[15px] font-mono tracking-wider">{c.code}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusBadgeCls(c)}`}>
                          {statusBadgeLabel(c)}
                        </span>
                        {isAllStores && c.storeId && storeNameMap[c.storeId] && (
                          <span className="text-[11px] text-[#888]">🏪 {storeNameMap[c.storeId]}</span>
                        )}
                      </div>
                      <div className="text-[13px] text-[#555]">
                        {c.discountType === 'PERCENT' ? `${c.discountValue}% 할인` : `${c.discountValue.toLocaleString()}원 할인`}
                        {c.minOrderAmount > 0 && ` · 최소 ${c.minOrderAmount.toLocaleString()}원`}
                        {c.maxUses > 0 && ` · ${c.usedCount}/${c.maxUses} 사용`}
                        {c.expiresAt && ` · ~${new Date(c.expiresAt).toLocaleDateString('ko-KR')}`}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setImageOpenId(imageOpenId === c.id ? null : c.id)}
                        className={`px-2.5 py-1 text-xs rounded-md border border-[#ff6b35] cursor-pointer ${
                          imageOpenId === c.id ? 'bg-[#ff6b35] text-white' : 'bg-white text-brand'
                        }`}
                      >
                        🖼️
                      </button>
                      {c.isActive && (
                        <button
                          onClick={() => handleDeactivate(c.id)}
                          className="px-3 py-1 text-xs rounded-md border border-[#ddd] bg-white cursor-pointer text-[#666]"
                        >
                          비활성화
                        </button>
                      )}
                    </div>
                  </div>
                  {imageOpenId === c.id && (
                    <div className="px-4 py-2.5 border-t border-[#eee] bg-[#fff8f5]">
                      <div className="font-semibold text-xs text-[#555] mb-2">쿠폰 이미지 관리</div>
                      <ImageManagerWidget entityType="coupons" entityId={c.id} readonly={isAllStores} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
