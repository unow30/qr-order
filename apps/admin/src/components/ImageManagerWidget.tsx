import { useEffect, useState } from 'react';
import { EntityImage, ImageEntityType, ReviewImage } from '@qr-order/shared-types';
import {
  getImages,
  createImage,
  updateImage,
  deleteImage,
  getReviewImages,
  deleteReviewImage,
  getPresignedUrl,
  uploadToS3,
} from '@admin/api/image.api';
import { useAuthStore } from '@admin/stores/authStore';

interface Props {
  entityType: ImageEntityType;
  entityId: string;
  readonly?: boolean;
}

interface AddForm {
  imageUrl: string;
  altText: string;
  priority: string;
  sortOrder: string;
  startAt: string;
  endAt: string;
}

const DEFAULT_FORM: AddForm = {
  imageUrl: '',
  altText: '',
  priority: '0',
  sortOrder: '0',
  startAt: '',
  endAt: '',
};

/** entityType에 따른 기본 alt 텍스트 */
function getDefaultAltText(entityType: ImageEntityType): string {
  switch (entityType) {
    case 'stores': return '매장 이미지';
    case 'tables': return '테이블 이미지';
    case 'menu-categories': return '카테고리 이미지';
    case 'menu-items': return '메뉴 이미지';
    case 'coupons': return '쿠폰 이미지';
    case 'reviews': return '리뷰 이미지';
    default: return '이미지';
  }
}

function isActive(img: EntityImage): boolean {
  const now = new Date();
  const start = img.startAt ? new Date(img.startAt) : null;
  const end = img.endAt ? new Date(img.endAt) : null;
  if (start && start > now) return false;
  if (end && end < now) return false;
  return img.isActive;
}

function isEventImage(img: EntityImage): boolean {
  return !!(img.startAt || img.endAt);
}

export default function ImageManagerWidget({ entityType, entityId, readonly = false }: Props) {
  const [images, setImages] = useState<EntityImage[] | ReviewImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<AddForm>(DEFAULT_FORM);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AddForm>(DEFAULT_FORM);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isReview = entityType === 'reviews';

  const fetchImages = async () => {
    setLoading(true);
    try {
      if (isReview) {
        const result = await getReviewImages(entityId);
        setImages(result);
      } else {
        const result = await getImages(entityType, entityId);
        setImages(result);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [entityType, entityId]);

  const handleFileSelect = async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setUploadError('지원하지 않는 파일 형식입니다. (jpeg, png, webp, gif)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('파일 크기가 5MB를 초과합니다.');
      return;
    }

    // 매장 미선택 가드 (X-Store-Id 헤더 없이 호출 시 백엔드 400)
    const { currentStoreId, storeIds } = useAuthStore.getState();
    if (!currentStoreId && storeIds.length !== 1) {
      const msg = '매장을 먼저 선택해주세요.';
      setUploadError(msg);
      if (typeof window !== 'undefined') window.alert(msg);
      return;
    }

    setUploading(true);
    setUploadError(null);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const { presignedUrl, imageUrl } = await getPresignedUrl({
        fileName: file.name,
        contentType: file.type,
        contentLength: file.size,
        entityType,
      });
      await uploadToS3(presignedUrl, file);
      setForm((prev) => ({ ...prev, imageUrl }));
      setUploadError(null);
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setUploadError(serverMsg || '업로드에 실패했습니다. 다시 시도해주세요.');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.imageUrl.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const altText = form.altText.trim() || getDefaultAltText(entityType);
      await createImage(entityType as Exclude<ImageEntityType, 'reviews'>, entityId, {
        imageUrl: form.imageUrl.trim(),
        altText,
        priority: parseInt(form.priority) || 0,
        sortOrder: parseInt(form.sortOrder) || 0,
        startAt: form.startAt || null,
        endAt: form.endAt || null,
      });
      setForm(DEFAULT_FORM);
      setPreviewUrl(null);
      setUploadError(null);
      setAddError(null);
      fetchImages();
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setAddError(serverMsg || '이미지 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (img: EntityImage) => {
    await updateImage(entityType as Exclude<ImageEntityType, 'reviews'>, entityId, img.id, {
      isActive: !img.isActive,
    });
    fetchImages();
  };

  const openEdit = (img: EntityImage) => {
    setEditId(img.id);
    setEditForm({
      imageUrl: img.imageUrl,
      altText: img.altText ?? '',
      priority: String(img.priority),
      sortOrder: String(img.sortOrder),
      startAt: img.startAt ? img.startAt.slice(0, 16) : '',
      endAt: img.endAt ? img.endAt.slice(0, 16) : '',
    });
  };

  const handleEditSave = async () => {
    if (!editId) return;
    const altText = editForm.altText.trim() || getDefaultAltText(entityType);
    await updateImage(entityType as Exclude<ImageEntityType, 'reviews'>, entityId, editId, {
      imageUrl: editForm.imageUrl.trim(),
      altText,
      priority: parseInt(editForm.priority) || 0,
      sortOrder: parseInt(editForm.sortOrder) || 0,
      startAt: editForm.startAt || null,
      endAt: editForm.endAt || null,
    });
    setEditId(null);
    fetchImages();
  };

  const handleDelete = async (img: EntityImage | ReviewImage) => {
    if (!window.confirm('이미지를 삭제하시겠습니까?')) return;
    if (isReview) {
      await deleteReviewImage(entityId, img.id);
    } else {
      await deleteImage(entityType as Exclude<ImageEntityType, 'reviews'>, entityId, img.id);
    }
    fetchImages();
  };

  const inputCls = 'w-full px-2.5 py-1 border border-gray-200 rounded text-[11px] box-border mb-1';

  return (
    <div className="mt-3">
      {/* 이미지 목록 */}
      {loading ? (
        <div className="text-gray-400 text-[13px]">로딩 중...</div>
      ) : images.length === 0 ? (
        <div className="text-gray-300 text-[13px] mb-2">등록된 이미지가 없습니다.</div>
      ) : (
        <div className="flex flex-wrap gap-2.5 mb-3">
          {images.map((img) => {
            const scheduled = !isReview && isEventImage(img as EntityImage);
            const active = !isReview && isActive(img as EntityImage);
            const isEditing = editId === img.id;

            return (
              <div
                key={img.id}
                className={`rounded-lg p-2.5 bg-gray-50 text-xs min-w-[160px] max-w-[220px] border ${active && !isReview ? 'border-green-500' : 'border-gray-200'}`}
              >
                {/* 썸네일 */}
                <div className="mb-1.5">
                  <img
                    src={(img as EntityImage).imageUrl}
                    alt={(img as EntityImage).altText ?? ''}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    className="w-full h-20 object-cover rounded bg-gray-200"
                  />
                </div>

                {/* URL (말줄임) */}
                <div className="text-gray-500 break-all text-[11px] mb-1">
                  {(img as EntityImage).imageUrl.length > 40
                    ? (img as EntityImage).imageUrl.slice(0, 40) + '...'
                    : (img as EntityImage).imageUrl}
                </div>

                {/* 배지 */}
                {!isReview && (
                  <div className="flex gap-1 flex-wrap mb-1.5">
                    {scheduled && (
                      <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded-full text-[10px]">이벤트</span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-green-50 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                      {active ? '활성' : '비활성'}
                    </span>
                    {(img as EntityImage).priority > 0 && (
                      <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-full text-[10px]">
                        우선순위 {(img as EntityImage).priority}
                      </span>
                    )}
                  </div>
                )}

                {/* 이벤트 기간 표시 */}
                {scheduled && (img as EntityImage).startAt && (
                  <div className="text-[10px] text-gray-500 mb-1">
                    {(img as EntityImage).startAt?.slice(0, 10)} ~ {(img as EntityImage).endAt?.slice(0, 10) ?? '∞'}
                  </div>
                )}

                {/* 수정 폼 (인라인 확장) */}
                {isEditing && !isReview && (
                  <div className="mt-2 border-t border-gray-100 pt-2">
                    <input value={editForm.altText} onChange={(e) => setEditForm({ ...editForm, altText: e.target.value })} placeholder={`alt 텍스트 (기본: ${getDefaultAltText(entityType)})`} className={inputCls} />
                    <div className="flex gap-1 mb-1">
                      <input type="number" value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} placeholder="우선순위" min={0} className="flex-1 px-1.5 py-1 border border-gray-200 rounded text-[11px]" />
                      <input type="number" value={editForm.sortOrder} onChange={(e) => setEditForm({ ...editForm, sortOrder: e.target.value })} placeholder="순서" min={0} className="flex-1 px-1.5 py-1 border border-gray-200 rounded text-[11px]" />
                    </div>
                    <div className="text-[10px] text-gray-400 mb-0.5">이벤트 기간 (비워두면 영구)</div>
                    <input type="datetime-local" value={editForm.startAt} onChange={(e) => setEditForm({ ...editForm, startAt: e.target.value })} className={inputCls} />
                    <input type="datetime-local" value={editForm.endAt} onChange={(e) => setEditForm({ ...editForm, endAt: e.target.value })} className="w-full px-2.5 py-1 border border-gray-200 rounded text-[11px] box-border mb-1.5" />
                    <div className="flex gap-1">
                      <button onClick={handleEditSave} className="flex-1 py-1 bg-[#ff6b35] text-white border-none rounded cursor-pointer text-[11px]">저장</button>
                      <button onClick={() => setEditId(null)} className="flex-1 py-1 bg-gray-100 text-gray-500 border border-gray-200 rounded cursor-pointer text-[11px]">취소</button>
                    </div>
                  </div>
                )}

                {/* 액션 버튼 */}
                {!isEditing && (
                  <div className="flex gap-1 mt-1.5">
                    {!readonly && !isReview && (
                      <>
                        <button onClick={() => handleToggleActive(img as EntityImage)} className="flex-1 py-0.5 bg-transparent text-gray-500 border border-gray-200 rounded cursor-pointer text-[10px]">
                          {(img as EntityImage).isActive ? '비활성화' : '활성화'}
                        </button>
                        <button onClick={() => openEdit(img as EntityImage)} className="flex-1 py-0.5 bg-transparent text-blue-600 border border-blue-600 rounded cursor-pointer text-[10px]">
                          수정
                        </button>
                      </>
                    )}
                    <button onClick={() => handleDelete(img)} className="flex-1 py-0.5 bg-transparent text-red-600 border border-red-600 rounded cursor-pointer text-[10px]">
                      삭제
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 이미지 추가 폼 */}
      {!readonly && !isReview && (
        <div className="border-t border-gray-100 pt-2.5">
          <div className="font-semibold text-xs text-gray-500 mb-2">이미지 추가</div>

          {/* 파일 업로드 영역 */}
          <div className="mb-2">
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#ff6b35] transition-colors bg-gray-50">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                  e.target.value = '';
                }}
              />
              {uploading ? (
                <span className="text-xs text-gray-500">업로드 중...</span>
              ) : previewUrl && form.imageUrl ? (
                <div className="flex items-center gap-2">
                  <img src={previewUrl} alt="미리보기" className="h-16 w-16 object-cover rounded" />
                  <span className="text-[11px] text-green-600">업로드 완료 (다시 선택 가능)</span>
                </div>
              ) : (
                <>
                  <span className="text-xs text-gray-500">클릭하여 이미지 선택</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">jpeg, png, webp, gif / 최대 5MB</span>
                </>
              )}
            </label>
            {uploadError && <p className="text-[11px] text-red-500 mt-1">{uploadError}</p>}
          </div>

          <input value={form.altText} onChange={(e) => setForm({ ...form, altText: e.target.value })} placeholder={`alt 텍스트 (기본: ${getDefaultAltText(entityType)})`} className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs mb-1.5 box-border" />
          <div className="flex gap-1.5 mb-1.5">
            <div className="flex-1">
              <div className="text-[10px] text-gray-400 mb-0.5">우선순위 (기본: 0)</div>
              <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} min={0} className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs box-border" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-gray-400 mb-0.5">표시 순서</div>
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} min={0} className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs box-border" />
            </div>
          </div>
          <div className="text-[10px] text-gray-400 mb-1">이벤트 기간 (비워두면 영구 노출. 기간 중복 시 우선순위 높은 이미지 표시)</div>
          <div className="flex gap-1.5 mb-2">
            <div className="flex-1">
              <div className="text-[10px] text-gray-400 mb-0.5">시작일시</div>
              <input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-[11px] box-border" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-gray-400 mb-0.5">종료일시</div>
              <input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-[11px] box-border" />
            </div>
          </div>
          {addError && <p className="text-[11px] text-red-500 mb-1.5">{addError}</p>}
          <button
            onClick={handleAdd}
            disabled={adding || !form.imageUrl.trim()}
            className={`w-full py-1.5 text-white border-none rounded-md cursor-pointer text-xs font-semibold ${adding || !form.imageUrl.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#ff6b35]'}`}
          >
            {adding ? '추가 중...' : '이미지 추가'}
          </button>
        </div>
      )}
    </div>
  );
}
