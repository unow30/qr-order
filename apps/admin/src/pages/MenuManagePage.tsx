import { useEffect, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  getMenu,
  createCategory,
  deleteCategory,
  createItem,
  deleteItem,
  updateStock,
  reorderCategories as apiReorderCategories,
  reorderItems as apiReorderItems,
} from '../api/menu.api';
import { MenuCategory, MenuItem } from '@qr-order/shared-types';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuthStore } from '../stores/authStore';
import { useStoreNames } from '../hooks/useStoreNames';
import ImageManagerWidget from '../components/ImageManagerWidget';

type DeleteTarget =
  | { type: 'category'; id: string; name: string }
  | { type: 'item'; id: string; name: string };

interface StockEditState {
  itemId: string;
  stockEnabled: boolean;
  stock: number;
}

interface MenuItemRowProps {
  item: MenuItem;
  isAllStores: boolean;
  stockEdit: StockEditState | null;
  stockSaving: boolean;
  imageOpenId: string | null;
  onOpenStockEdit: (item: MenuItem) => void;
  onCloseStockEdit: () => void;
  onStockChange: (field: 'stockEnabled' | 'stock', value: boolean | number) => void;
  onStockSave: () => void;
  onImageToggle: (id: string) => void;
  onDeleteRequest: (item: MenuItem) => void;
}

function SortableMenuItemRow({
  item,
  isAllStores,
  stockEdit,
  stockSaving,
  imageOpenId,
  onOpenStockEdit,
  onCloseStockEdit,
  onStockChange,
  onStockSave,
  onImageToggle,
  onDeleteRequest,
}: MenuItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: isAllStores,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          {!isAllStores && (
            <span
              {...attributes}
              {...listeners}
              style={{ cursor: 'grab', color: '#ccc', fontSize: 16, padding: '0 4px', userSelect: 'none' }}
              title="드래그하여 순서 변경"
            >
              ⠿
            </span>
          )}
          <div>
            <span style={{ fontWeight: 500 }}>{item.name}</span>
            <span style={{ marginLeft: 12, color: '#ff6b35' }}>{item.price.toLocaleString()}원</span>
            {item.stockEnabled && (
              <span style={{
                marginLeft: 8,
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 10,
                background: item.stock > 0 ? '#dcfce7' : '#fee2e2',
                color: item.stock > 0 ? '#166534' : '#dc2626',
              }}>
                {item.stock > 0 ? `재고 ${item.stock}개` : '품절'}
              </span>
            )}
            {!item.isAvailable && (
              <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 6px', borderRadius: 10, background: '#f3f4f6', color: '#6b7280' }}>
                판매중단
              </span>
            )}
          </div>
        </div>
        {!isAllStores && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => stockEdit?.itemId === item.id ? onCloseStockEdit() : onOpenStockEdit(item)}
              style={{
                background: stockEdit?.itemId === item.id ? '#2563eb' : 'none',
                color: stockEdit?.itemId === item.id ? '#fff' : '#2563eb',
                border: '1px solid #2563eb',
                padding: '3px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              재고
            </button>
            <button
              onClick={() => onImageToggle(`item-${item.id}`)}
              style={{
                background: imageOpenId === `item-${item.id}` ? '#ff6b35' : 'none',
                color: imageOpenId === `item-${item.id}` ? '#fff' : '#ff6b35',
                border: '1px solid #ff6b35',
                padding: '3px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              🖼️
            </button>
            <button
              onClick={() => onDeleteRequest(item)}
              style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16 }}
            >×</button>
          </div>
        )}
      </div>

      {/* 재고 편집 패널 */}
      {!isAllStores && stockEdit?.itemId === item.id && (
        <div style={{
          margin: '4px 0 8px',
          padding: '12px 16px',
          background: '#eff6ff',
          borderRadius: 8,
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={stockEdit.stockEnabled}
              onChange={(e) => onStockChange('stockEnabled', e.target.checked)}
            />
            재고 관리 활성화
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            재고 수량
            <input
              type="number"
              min={0}
              value={stockEdit.stock}
              disabled={!stockEdit.stockEnabled}
              onChange={(e) => onStockChange('stock', Math.max(0, parseInt(e.target.value) || 0))}
              style={{ width: 70, padding: '4px 8px', border: '1px solid #93c5fd', borderRadius: 6, fontSize: 13 }}
            />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onStockSave}
              disabled={stockSaving}
              style={{
                padding: '5px 14px',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: stockSaving ? 'not-allowed' : 'pointer',
                fontSize: 12,
                opacity: stockSaving ? 0.6 : 1,
              }}
            >
              {stockSaving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={onCloseStockEdit}
              style={{ padding: '5px 14px', background: 'none', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 아이템 이미지 패널 */}
      {imageOpenId === `item-${item.id}` && (
        <div style={{ margin: '4px 0 8px', padding: '12px 16px', background: '#fff8f5', borderRadius: 8, border: '1px solid #ffd5c2' }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>메뉴 이미지 관리</div>
          <ImageManagerWidget entityType="menu-items" entityId={item.id} readonly={isAllStores} />
        </div>
      )}
    </div>
  );
}

interface CategoryCardProps {
  cat: MenuCategory;
  isAllStores: boolean;
  storeNameMap: Record<string, string>;
  stockEdit: StockEditState | null;
  stockSaving: boolean;
  imageOpenId: string | null;
  onOpenStockEdit: (item: MenuItem) => void;
  onCloseStockEdit: () => void;
  onStockChange: (field: 'stockEnabled' | 'stock', value: boolean | number) => void;
  onStockSave: () => void;
  onImageToggle: (id: string) => void;
  onDeleteCategoryRequest: (cat: MenuCategory) => void;
  onDeleteItemRequest: (item: MenuItem) => void;
  onItemDragEnd: (categoryId: string, event: DragEndEvent) => void;
}

function SortableCategoryCard({
  cat,
  isAllStores,
  storeNameMap,
  stockEdit,
  stockSaving,
  imageOpenId,
  onOpenStockEdit,
  onCloseStockEdit,
  onStockChange,
  onStockSave,
  onImageToggle,
  onDeleteCategoryRequest,
  onDeleteItemRequest,
  onItemDragEnd,
}: CategoryCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cat.id,
    disabled: isAllStores,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const itemIds = (cat.items ?? []).map((item) => item.id);

  const itemSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  return (
    <div ref={setNodeRef} style={{ ...style, background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isAllStores && (
            <span
              {...attributes}
              {...listeners}
              style={{ cursor: 'grab', color: '#bbb', fontSize: 20, userSelect: 'none', padding: '0 4px' }}
              title="드래그하여 카테고리 순서 변경"
            >
              ⠿
            </span>
          )}
          <div>
            <h3 style={{ margin: 0 }}>{cat.name}</h3>
            {isAllStores && cat.storeId && storeNameMap[cat.storeId] && (
              <span style={{ fontSize: 12, color: '#888' }}>🏪 {storeNameMap[cat.storeId]}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => onImageToggle(`cat-${cat.id}`)}
            style={{
              background: imageOpenId === `cat-${cat.id}` ? '#ff6b35' : 'none',
              color: imageOpenId === `cat-${cat.id}` ? '#fff' : '#ff6b35',
              border: '1px solid #ff6b35', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
            }}
          >
            🖼️ 이미지
          </button>
          {!isAllStores && (
            <button
              onClick={() => onDeleteCategoryRequest(cat)}
              style={{ background: 'none', color: '#e53935', border: '1px solid #e53935', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {/* 카테고리 이미지 패널 */}
      {imageOpenId === `cat-${cat.id}` && (
        <div style={{ margin: '4px 0 12px', padding: '12px 16px', background: '#fff8f5', borderRadius: 8, border: '1px solid #ffd5c2' }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>카테고리 이미지 관리</div>
          <ImageManagerWidget entityType="menu-categories" entityId={cat.id} readonly={isAllStores} />
        </div>
      )}

      {/* 아이템 목록 (DnD) */}
      <DndContext
        sensors={itemSensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => onItemDragEnd(cat.id, e)}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {(cat.items ?? []).map((item) => (
            <SortableMenuItemRow
              key={item.id}
              item={item}
              isAllStores={isAllStores}
              stockEdit={stockEdit}
              stockSaving={stockSaving}
              imageOpenId={imageOpenId}
              onOpenStockEdit={onOpenStockEdit}
              onCloseStockEdit={onCloseStockEdit}
              onStockChange={onStockChange}
              onStockSave={onStockSave}
              onImageToggle={onImageToggle}
              onDeleteRequest={onDeleteItemRequest}
            />
          ))}
        </SortableContext>
      </DndContext>
      {!cat.items?.length && <p style={{ color: '#888', fontSize: 14 }}>메뉴가 없습니다.</p>}
    </div>
  );
}

export default function MenuManagePage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [stockEdit, setStockEdit] = useState<StockEditState | null>(null);
  const [stockSaving, setStockSaving] = useState(false);
  const [imageOpenId, setImageOpenId] = useState<string | null>(null);
  const { currentStoreId, isSuperAdmin } = useAuthStore();
  const superAdmin = isSuperAdmin();
  const isAllStores = superAdmin && !currentStoreId;
  const storeNameMap = useStoreNames();

  const fetchMenu = () => getMenu().then(setCategories);

  useEffect(() => { fetchMenu(); }, [currentStoreId]);

  const categorySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    await createCategory({ name: newCatName });
    setNewCatName('');
    fetchMenu();
  };

  const handleAddItem = async () => {
    if (!selectedCatId || !newItemName.trim() || !newItemPrice) return;
    await createItem({ categoryId: selectedCatId, name: newItemName, price: parseInt(newItemPrice) });
    setNewItemName('');
    setNewItemPrice('');
    fetchMenu();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'category') await deleteCategory(deleteTarget.id);
    else await deleteItem(deleteTarget.id);
    setDeleteTarget(null);
    fetchMenu();
  };

  const openStockEdit = (item: MenuItem) => {
    setStockEdit({
      itemId: item.id,
      stockEnabled: item.stockEnabled ?? false,
      stock: item.stock ?? 0,
    });
  };

  const handleStockChange = (field: 'stockEnabled' | 'stock', value: boolean | number) => {
    setStockEdit((s) => s ? { ...s, [field]: value } : s);
  };

  const handleStockSave = async () => {
    if (!stockEdit) return;
    setStockSaving(true);
    try {
      await updateStock(stockEdit.itemId, {
        stock: stockEdit.stock,
        stockEnabled: stockEdit.stockEnabled,
      });
      setStockEdit(null);
      fetchMenu();
    } finally {
      setStockSaving(false);
    }
  };

  const handleImageToggle = (id: string) => {
    setImageOpenId((prev) => (prev === id ? null : id));
  };

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);
    setCategories(reordered);
    try {
      await apiReorderCategories({ orders: reordered.map((c, i) => ({ id: c.id, sortOrder: i })) });
    } catch {
      fetchMenu();
    }
  };

  const handleItemDragEnd = async (categoryId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const catIndex = categories.findIndex((c) => c.id === categoryId);
    if (catIndex === -1) return;
    const items = categories[catIndex].items ?? [];
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const reorderedItems = arrayMove(items, oldIndex, newIndex);
    const updated = categories.map((c, i) =>
      i === catIndex ? { ...c, items: reorderedItems } : c,
    );
    setCategories(updated);
    try {
      await apiReorderItems({ orders: reorderedItems.map((item, i) => ({ id: item.id, sortOrder: i })) });
    } catch {
      fetchMenu();
    }
  };

  const dialogMessage = deleteTarget?.type === 'category'
    ? `'${deleteTarget.name}' 카테고리를 삭제하면 해당 메뉴도 모두 삭제됩니다.`
    : `'${deleteTarget?.name}' 메뉴를 삭제하시겠습니까?`;

  const categoryIds = categories.map((c) => c.id);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>메뉴 관리</h2>
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

      {isAllStores ? (
        <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 12, padding: '16px 20px', marginBottom: 24, color: '#795548' }}>
          전체 보기 모드입니다. 메뉴를 추가/수정하려면 상단에서 매장을 선택해주세요.
        </div>
      ) : (
        <>
          {/* 카테고리 추가 */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 12px' }}>카테고리 추가</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="카테고리명"
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8 }}
              />
              <button onClick={handleAddCategory} style={{ padding: '8px 16px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                추가
              </button>
            </div>
          </div>

          {/* 메뉴 아이템 추가 */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 12px' }}>메뉴 아이템 추가</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={selectedCatId} onChange={(e) => setSelectedCatId(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8 }}>
                <option value="">카테고리 선택</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="메뉴명" style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8 }} />
              <input value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} placeholder="가격" type="number" style={{ width: 100, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8 }} />
              <button onClick={handleAddItem} style={{ padding: '8px 16px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>추가</button>
            </div>
          </div>
        </>
      )}

      {/* 카테고리/메뉴 목록 (드래그앤드롭) */}
      <DndContext
        sensors={categorySensors}
        collisionDetection={closestCenter}
        onDragEnd={handleCategoryDragEnd}
      >
        <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
          {categories.map((cat) => (
            <SortableCategoryCard
              key={cat.id}
              cat={cat}
              isAllStores={isAllStores}
              storeNameMap={storeNameMap}
              stockEdit={stockEdit}
              stockSaving={stockSaving}
              imageOpenId={imageOpenId}
              onOpenStockEdit={openStockEdit}
              onCloseStockEdit={() => setStockEdit(null)}
              onStockChange={handleStockChange}
              onStockSave={handleStockSave}
              onImageToggle={handleImageToggle}
              onDeleteCategoryRequest={(c) => setDeleteTarget({ type: 'category', id: c.id, name: c.name })}
              onDeleteItemRequest={(item) => setDeleteTarget({ type: 'item', id: item.id, name: item.name })}
              onItemDragEnd={handleItemDragEnd}
            />
          ))}
        </SortableContext>
      </DndContext>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={deleteTarget?.type === 'category' ? '카테고리 삭제' : '메뉴 삭제'}
        message={dialogMessage}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
