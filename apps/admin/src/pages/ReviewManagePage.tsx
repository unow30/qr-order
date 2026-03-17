import { useEffect, useState } from 'react';
import { getReviews, toggleReviewVisibility, deleteReview, ReviewItem } from '../api/review.api';
import { useAuthStore } from '../stores/authStore';
import { useStoreNames } from '../hooks/useStoreNames';
import ImageManagerWidget from '../components/ImageManagerWidget';

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 tracking-wide">
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
      <div className="flex items-center gap-3 mb-6">
        <h2 className="m-0">리뷰 관리</h2>
        {superAdmin && (
          <span className={`px-3 py-1 rounded-full text-[13px] font-semibold ${
            isAllStores ? 'bg-[#e8f5e9] text-[#1b5e20]' : 'bg-[#e3f2fd] text-[#0d47a1]'
          }`}>
            {isAllStores ? '전체 매장' : (storeNameMap[currentStoreId!] || '선택된 매장')}
          </span>
        )}
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: '전체 리뷰', value: totalReviews },
          { label: '공개 리뷰', value: visibleCount },
          { label: '평균 평점', value: `${avgRating} / 5.0` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-[#e5e7eb] rounded-lg px-5 py-4">
            <p className="m-0 text-xs text-[#6b7280]">{label}</p>
            <p className="mt-1.5 mb-0 text-[22px] font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-4">
        {(['all', 'visible', 'hidden'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full border cursor-pointer text-[13px] ${
              filter === f
                ? 'bg-[#2563eb] text-white border-[#2563eb]'
                : 'bg-white text-[#374151] border-[#d1d5db]'
            }`}
          >
            {{ all: '전체', visible: '공개', hidden: '비공개' }[f]}
          </button>
        ))}
        <span className="ml-auto text-[13px] text-[#6b7280] self-center">
          {filteredReviews.length}건
        </span>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div className="p-3 bg-[#fee2e2] text-[#dc2626] rounded-md mb-4">
          {error}
        </div>
      )}

      {/* 리뷰 목록 */}
      {loading ? (
        <p className="text-[#6b7280]">불러오는 중...</p>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-[#9ca3af]">
          리뷰가 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className={`bg-white rounded-xl px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] border ${
                review.isVisible ? 'opacity-100 border-[#e5e7eb]' : 'opacity-60 border-[#d1d5db]'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* 상단: 메뉴명 + 평점 */}
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="font-semibold text-[15px]">{review.menuItemName}</span>
                    <StarRating rating={review.rating} />
                    <span className="text-[13px] text-[#6b7280]">({review.rating}/5)</span>
                    {!review.isVisible && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#f3f4f6] text-[#6b7280]">
                        비공개
                      </span>
                    )}
                    {isAllStores && review.storeId && storeNameMap[review.storeId] && (
                      <span className="text-[11px] text-[#888] ml-1">
                        🏪 {storeNameMap[review.storeId]}
                      </span>
                    )}
                  </div>
                  {/* 리뷰 내용 */}
                  {review.comment && (
                    <p className="m-0 mb-2 text-sm text-[#374151] leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                  {/* 메타 정보 */}
                  <p className="m-0 mb-1.5 text-xs text-[#9ca3af]">
                    {new Date(review.createdAt).toLocaleString('ko-KR')}
                  </p>
                  {/* 리뷰 이미지 토글 */}
                  <button
                    onClick={() => setImageOpenId(imageOpenId === review.id ? null : review.id)}
                    className={`px-2.5 py-0.5 text-[11px] rounded-md border border-[#d1d5db] cursor-pointer text-[#6b7280] ${
                      imageOpenId === review.id ? 'bg-[#f3f4f6]' : 'bg-white'
                    }`}
                  >
                    🖼️ 첨부 이미지
                  </button>
                  {imageOpenId === review.id && (
                    <div className="mt-2 pt-2 border-t border-[#f3f4f6]">
                      <ImageManagerWidget entityType="reviews" entityId={review.id} readonly={true} />
                    </div>
                  )}
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleToggleVisibility(review.id)}
                    className={`px-3 py-1 text-xs border rounded-md cursor-pointer ${
                      review.isVisible
                        ? 'bg-white text-[#374151] border-[#d1d5db]'
                        : 'bg-[#2563eb] text-white border-[#2563eb]'
                    }`}
                  >
                    {review.isVisible ? '비공개' : '공개'}
                  </button>
                  <button
                    onClick={() => handleDelete(review.id, review.menuItemName)}
                    className="px-3 py-1 text-xs border border-[#ef4444] rounded-md cursor-pointer bg-transparent text-[#ef4444]"
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
