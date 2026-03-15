import { useState, useEffect } from 'react';
import { getCoupons, createCoupon, deactivateCoupon, Coupon, DiscountType } from '../api/coupon.api';
import { useAuthStore } from '../stores/authStore';
import { useStoreNames } from '../hooks/useStoreNames';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #ddd',
  borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
};
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 24,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
};

function statusBadge(c: Coupon) {
  if (!c.isActive) return { label: '비활성', color: '#9ca3af', bg: '#f3f4f6' };
  if (c.expiresAt && new Date(c.expiresAt) < new Date())
    return { label: '만료', color: '#dc2626', bg: '#fee2e2' };
  if (c.maxUses > 0 && c.usedCount >= c.maxUses)
    return { label: '소진', color: '#d97706', bg: '#fef3c7' };
  return { label: '사용 가능', color: '#059669', bg: '#d1fae5' };
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>쿠폰 관리</h2>
        {superAdmin && (
          <span style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
            background: isAllStores ? '#e8f5e9' : '#e3f2fd',
            color: isAllStores ? '#1b5e20' : '#0d47a1',
          }}>
            {isAllStores ? '전체 매장' : (storeNameMap[currentStoreId!] || '선택된 매장')}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isAllStores ? '1fr' : '380px 1fr', gap: 24 }}>

        {/* 쿠폰 생성 폼 (매장 선택 모드에서만) */}
        {!isAllStores && (
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>쿠폰 생성</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                style={inputStyle} placeholder="쿠폰 코드 (예: SUMMER20)"
                value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required
              />
              <select style={inputStyle} value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                <option value="PERCENT">비율 할인 (%)</option>
                <option value="FIXED">정액 할인 (원)</option>
              </select>
              <input
                style={inputStyle}
                placeholder={discountType === 'PERCENT' ? '할인율 (1~100)' : '할인 금액 (원)'}
                type="number" min="1" value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)} required
              />
              <input
                style={inputStyle} placeholder="최소 주문 금액 (0 = 무제한)"
                type="number" min="0" value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
              />
              <input
                style={inputStyle} placeholder="최대 사용 횟수 (0 = 무제한)"
                type="number" min="0" value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
              <div>
                <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>만료일 (선택)</label>
                <input style={inputStyle} type="date" value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
              {formError && <p style={{ color: '#e53935', fontSize: 13, margin: 0 }}>{formError}</p>}
              <button
                type="submit" disabled={loading}
                style={{ padding: '9px 18px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, opacity: loading ? 0.6 : 1 }}
              >
                쿠폰 생성
              </button>
            </form>
          </div>
        )}

        {/* 쿠폰 목록 */}
        <div style={cardStyle}>
          {isAllStores && (
            <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#795548', fontSize: 13 }}>
              전체 보기 모드입니다. 쿠폰을 생성하려면 상단에서 매장을 선택해주세요.
            </div>
          )}
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>쿠폰 목록 ({coupons.length}개)</h3>
          {coupons.length === 0 ? (
            <p style={{ color: '#999', fontSize: 14 }}>등록된 쿠폰이 없습니다.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {coupons.map((c) => {
                const badge = statusBadge(c);
                return (
                  <div key={c.id} style={{ padding: '14px 16px', background: '#fafafa', borderRadius: 8, border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, fontFamily: 'monospace', letterSpacing: 1 }}>{c.code}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                        {isAllStores && c.storeId && storeNameMap[c.storeId] && (
                          <span style={{ fontSize: 11, color: '#888' }}>🏪 {storeNameMap[c.storeId]}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#555' }}>
                        {c.discountType === 'PERCENT' ? `${c.discountValue}% 할인` : `${c.discountValue.toLocaleString()}원 할인`}
                        {c.minOrderAmount > 0 && ` · 최소 ${c.minOrderAmount.toLocaleString()}원`}
                        {c.maxUses > 0 && ` · ${c.usedCount}/${c.maxUses} 사용`}
                        {c.expiresAt && ` · ~${new Date(c.expiresAt).toLocaleDateString('ko-KR')}`}
                      </div>
                    </div>
                    {c.isActive && (
                      <button
                        onClick={() => handleDeactivate(c.id)}
                        style={{ padding: '5px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', color: '#666' }}
                      >
                        비활성화
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
