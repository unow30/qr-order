import { useEffect, useState } from 'react';
import { getReviews, toggleReviewVisibility, deleteReview, ReviewItem } from '../api/review.api';
import { useAuthStore } from '../stores/authStore';
import { useStoreNames } from '../hooks/useStoreNames';
import ImageManagerWidget from '../components/ImageManagerWidget';

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#f59e0b', letterSpacing: 1 }}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

export default function ReviewManagePage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [imageOpenId, setImageOpenId] = useState<string | null>(null);
  const { currentStoreId, isSuperAdmin } = useAuthStore();
  const superAdmin = isSuperAdmin();
  const isAllStores = superAdmin && !currentStoreId;
  const storeNameMap = useStoreNames();

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReviews();
      setReviews(data);
    } catch {
      setError('리뷰를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, [currentStoreId]);

  const handleToggleVisibility = async (id: string) => {
    await toggleReviewVisibility(id);
    fetchReviews();
  };

  const handleDelete = async (id: string, menuItemName: string) => {
    if (!window.confirm(`'${menuItemName}' 리뷰를 삭제하시겠습니까?`)) return;
    await deleteReview(id);
    fetchReviews();
  };

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'visible') return r.isVisible;
    if (filter === 'hidden') return !r.isVisible;
    return true;
  });

  // 통계
  const totalReviews = reviews.length;
  const visibleCount = reviews.filter((r) => r.isVisible).length;
  const avgRating = totalReviews
    ? (reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1)
    : '0.0';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>리뷰 관리</h2>
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

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: '전체 리뷰', value: totalReviews },
          { label: '공개 리뷰', value: visibleCount },
          { label: '평균 평점', value: `${avgRating} / 5.0` },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '16px 20px' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{label}</p>
            <p style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 700 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* 필터 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all', 'visible', 'hidden'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: '1px solid',
              cursor: 'pointer',
              fontSize: 13,
              background: filter === f ? '#2563eb' : '#fff',
              color: filter === f ? '#fff' : '#374151',
              borderColor: filter === f ? '#2563eb' : '#d1d5db',
            }}
          >
            {{ all: '전체', visible: '공개', hidden: '비공개' }[f]}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#6b7280', alignSelf: 'center' }}>
          {filteredReviews.length}건
        </span>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div style={{ padding: 12, background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* 리뷰 목록 */}
      {loading ? (
        <p style={{ color: '#6b7280' }}>불러오는 중...</p>
      ) : filteredReviews.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#9ca3af' }}>
          리뷰가 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '16px 20px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                opacity: review.isVisible ? 1 : 0.6,
                border: review.isVisible ? '1px solid #e5e7eb' : '1px solid #d1d5db',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  {/* 상단: 메뉴명 + 평점 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{review.menuItemName}</span>
                    <StarRating rating={review.rating} />
                    <span style={{ fontSize: 13, color: '#6b7280' }}>({review.rating}/5)</span>
                    {!review.isVisible && (
                      <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 10, background: '#f3f4f6', color: '#6b7280' }}>
                        비공개
                      </span>
                    )}
                    {isAllStores && review.storeId && storeNameMap[review.storeId] && (
                      <span style={{ fontSize: 11, color: '#888', marginLeft: 4 }}>
                        🏪 {storeNameMap[review.storeId]}
                      </span>
                    )}
                  </div>
                  {/* 리뷰 내용 */}
                  {review.comment && (
                    <p style={{ margin: '0 0 8px', fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
                      {review.comment}
                    </p>
                  )}
                  {/* 메타 정보 */}
                  <p style={{ margin: '0 0 6px', fontSize: 12, color: '#9ca3af' }}>
                    {new Date(review.createdAt).toLocaleString('ko-KR')}
                  </p>
                  {/* 리뷰 이미지 토글 */}
                  <button
                    onClick={() => setImageOpenId(imageOpenId === review.id ? null : review.id)}
                    style={{
                      padding: '3px 10px', fontSize: 11, borderRadius: 6,
                      border: '1px solid #d1d5db',
                      background: imageOpenId === review.id ? '#f3f4f6' : '#fff',
                      color: '#6b7280', cursor: 'pointer',
                    }}
                  >
                    🖼️ 첨부 이미지
                  </button>
                  {imageOpenId === review.id && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
                      <ImageManagerWidget entityType="reviews" entityId={review.id} readonly={true} />
                    </div>
                  )}
                </div>

                {/* 액션 버튼 */}
                <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                  <button
                    onClick={() => handleToggleVisibility(review.id)}
                    style={{
                      padding: '5px 12px',
                      fontSize: 12,
                      border: '1px solid',
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: review.isVisible ? '#fff' : '#2563eb',
                      color: review.isVisible ? '#374151' : '#fff',
                      borderColor: review.isVisible ? '#d1d5db' : '#2563eb',
                    }}
                  >
                    {review.isVisible ? '비공개' : '공개'}
                  </button>
                  <button
                    onClick={() => handleDelete(review.id, review.menuItemName)}
                    style={{
                      padding: '5px 12px',
                      fontSize: 12,
                      border: '1px solid #ef4444',
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: 'none',
                      color: '#ef4444',
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
