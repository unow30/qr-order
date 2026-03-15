import { useEffect, useState } from 'react';
import { EntityImage, ImageEntityType, ReviewImage } from '@qr-order/shared-types';
import {
  getImages,
  createImage,
  updateImage,
  deleteImage,
  getReviewImages,
  deleteReviewImage,
} from '../api/image.api';

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
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AddForm>(DEFAULT_FORM);

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

  const handleAdd = async () => {
    if (!form.imageUrl.trim()) return;
    setAdding(true);
    try {
      await createImage(entityType as Exclude<ImageEntityType, 'reviews'>, entityId, {
        imageUrl: form.imageUrl.trim(),
        altText: form.altText.trim() || undefined,
        priority: parseInt(form.priority) || 0,
        sortOrder: parseInt(form.sortOrder) || 0,
        startAt: form.startAt || null,
        endAt: form.endAt || null,
      });
      setForm(DEFAULT_FORM);
      fetchImages();
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
    await updateImage(entityType as Exclude<ImageEntityType, 'reviews'>, entityId, editId, {
      imageUrl: editForm.imageUrl.trim(),
      altText: editForm.altText.trim() || undefined,
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

  return (
    <div style={{ marginTop: 12 }}>
      {/* 이미지 목록 */}
      {loading ? (
        <div style={{ color: '#999', fontSize: 13 }}>로딩 중...</div>
      ) : images.length === 0 ? (
        <div style={{ color: '#bbb', fontSize: 13, marginBottom: 8 }}>등록된 이미지가 없습니다.</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          {images.map((img) => {
            const scheduled = !isReview && isEventImage(img as EntityImage);
            const active = !isReview && isActive(img as EntityImage);
            const isEditing = editId === img.id;

            return (
              <div
                key={img.id}
                style={{
                  border: `1px solid ${active && !isReview ? '#4caf50' : '#e0e0e0'}`,
                  borderRadius: 8,
                  padding: 10,
                  background: '#fafafa',
                  minWidth: 160,
                  maxWidth: 220,
                  fontSize: 12,
                }}
              >
                {/* 썸네일 */}
                <div style={{ marginBottom: 6 }}>
                  <img
                    src={(img as EntityImage).imageUrl}
                    alt={(img as EntityImage).altText ?? ''}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4, background: '#eee' }}
                  />
                </div>

                {/* URL (말줄임) */}
                <div style={{ color: '#555', wordBreak: 'break-all', fontSize: 11, marginBottom: 4 }}>
                  {(img as EntityImage).imageUrl.length > 40
                    ? (img as EntityImage).imageUrl.slice(0, 40) + '...'
                    : (img as EntityImage).imageUrl}
                </div>

                {/* 배지 */}
                {!isReview && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                    {scheduled && (
                      <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '1px 6px', borderRadius: 10, fontSize: 10 }}>
                        이벤트
                      </span>
                    )}
                    <span style={{
                      background: active ? '#e8f5e9' : '#f5f5f5',
                      color: active ? '#2e7d32' : '#9e9e9e',
                      padding: '1px 6px', borderRadius: 10, fontSize: 10,
                    }}>
                      {active ? '활성' : '비활성'}
                    </span>
                    {(img as EntityImage).priority > 0 && (
                      <span style={{ background: '#fff3e0', color: '#e65100', padding: '1px 6px', borderRadius: 10, fontSize: 10 }}>
                        우선순위 {(img as EntityImage).priority}
                      </span>
                    )}
                  </div>
                )}

                {/* 이벤트 기간 표시 */}
                {scheduled && (img as EntityImage).startAt && (
                  <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>
                    {(img as EntityImage).startAt?.slice(0, 10)} ~ {(img as EntityImage).endAt?.slice(0, 10) ?? '∞'}
                  </div>
                )}

                {/* 수정 폼 (인라인 확장) */}
                {isEditing && !isReview && (
                  <div style={{ marginTop: 8, borderTop: '1px solid #eee', paddingTop: 8 }}>
                    <input
                      value={editForm.imageUrl}
                      onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                      placeholder="이미지 URL"
                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 11, marginBottom: 4, boxSizing: 'border-box' }}
                    />
                    <input
                      value={editForm.altText}
                      onChange={(e) => setEditForm({ ...editForm, altText: e.target.value })}
                      placeholder="alt 텍스트"
                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 11, marginBottom: 4, boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      <input
                        type="number"
                        value={editForm.priority}
                        onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                        placeholder="우선순위"
                        min={0}
                        style={{ flex: 1, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 11 }}
                      />
                      <input
                        type="number"
                        value={editForm.sortOrder}
                        onChange={(e) => setEditForm({ ...editForm, sortOrder: e.target.value })}
                        placeholder="순서"
                        min={0}
                        style={{ flex: 1, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 11 }}
                      />
                    </div>
                    <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>이벤트 기간 (비워두면 영구)</div>
                    <input
                      type="datetime-local"
                      value={editForm.startAt}
                      onChange={(e) => setEditForm({ ...editForm, startAt: e.target.value })}
                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 11, marginBottom: 4, boxSizing: 'border-box' }}
                    />
                    <input
                      type="datetime-local"
                      value={editForm.endAt}
                      onChange={(e) => setEditForm({ ...editForm, endAt: e.target.value })}
                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 11, marginBottom: 6, boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={handleEditSave} style={{ flex: 1, padding: '4px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>저장</button>
                      <button onClick={() => setEditId(null)} style={{ flex: 1, padding: '4px', background: '#f5f5f5', color: '#555', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>취소</button>
                    </div>
                  </div>
                )}

                {/* 액션 버튼 */}
                {!isEditing && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                    {!readonly && !isReview && (
                      <>
                        <button
                          onClick={() => handleToggleActive(img as EntityImage)}
                          style={{ flex: 1, padding: '3px 0', background: 'none', color: '#666', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}
                        >
                          {(img as EntityImage).isActive ? '비활성화' : '활성화'}
                        </button>
                        <button
                          onClick={() => openEdit(img as EntityImage)}
                          style={{ flex: 1, padding: '3px 0', background: 'none', color: '#2563eb', border: '1px solid #2563eb', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}
                        >
                          수정
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(img)}
                      style={{ flex: 1, padding: '3px 0', background: 'none', color: '#e53935', border: '1px solid #e53935', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}
                    >
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
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: '#555', marginBottom: 8 }}>이미지 추가</div>
          <input
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            placeholder="이미지 URL *"
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, marginBottom: 6, boxSizing: 'border-box' }}
          />
          <input
            value={form.altText}
            onChange={(e) => setForm({ ...form, altText: e.target.value })}
            placeholder="alt 텍스트 (선택)"
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, marginBottom: 6, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>우선순위 (기본: 0)</div>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                min={0}
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>표시 순서</div>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                min={0}
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#999', marginBottom: 4 }}>
            이벤트 기간 (비워두면 영구 노출. 기간 중복 시 우선순위 높은 이미지 표시)
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>시작일시</div>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 11, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>종료일시</div>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 11, boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !form.imageUrl.trim()}
            style={{
              width: '100%',
              padding: '7px',
              background: adding || !form.imageUrl.trim() ? '#ccc' : '#ff6b35',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: adding || !form.imageUrl.trim() ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {adding ? '추가 중...' : '이미지 추가'}
          </button>
        </div>
      )}
    </div>
  );
}
