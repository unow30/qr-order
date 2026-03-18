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
} from '@admin/api/menu.api';
import { MenuCategory, MenuItem } from '@qr-order/shared-types';
import ConfirmDialog from '@admin/components/ConfirmDialog';
import { useAuthStore } from '@admin/stores/authStore';
import { useStoreNames } from '@admin/hooks/useStoreNames';
import ImageManagerWidget from '@admin/components/ImageManagerWidget';

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

  // dnd-kit transform style 유지 (라이브러리 요구사항)
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex justify-between items-center py-2 border-t border-[#f0f0f0]">
        <div className="flex items-center gap-1.5 flex-1">
          {!isAllStores && (
            <span
              {...attributes}
              {...listeners}
              className="cursor-grab text-[#ccc] text-base px-1 select-none"
              title="드래그하여 순서 변경"
            >
              ⠿
            </span>
          )}
          <div>
            <span className="font-medium">{item.name}</span>
            <span className="ml-3 text-brand">{item.price.toLocaleString()}원</span>
            {item.stockEnabled && (
              <span className={`ml-2 text-[11px] px-1.5 py-0.5 rounded-full ${
                item.stock > 0 ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#dc2626]'
              }`}>
                {item.stock > 0 ? `재고 ${item.stock}개` : '품절'}
              </span>
            )}
            {!item.isAvailable && (
              <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full bg-[#f3f4f6] text-[#6b7280]">
                판매중단
              </span>
            )}
          </div>
        </div>
        {!isAllStores && (
          <div className="flex gap-1.5">
            <button
              onClick={() => stockEdit?.itemId === item.id ? onCloseStockEdit() : onOpenStockEdit(item)}
              className={`px-2 py-0.5 border border-[#2563eb] rounded-md cursor-pointer text-[11px] ${
                stockEdit?.itemId === item.id ? 'bg-[#2563eb] text-white' : 'bg-transparent text-[#2563eb]'
              }`}
            >
              재고
            </button>
            <button
              onClick={() => onImageToggle(`item-${item.id}`)}
              className={`px-2 py-0.5 border border-[#ff6b35] rounded-md cursor-pointer text-[11px] ${
                imageOpenId === `item-${item.id}` ? 'bg-[#ff6b35] text-white' : 'bg-transparent text-brand'
              }`}
            >
              🖼️
            </button>
            <button
              onClick={() => onDeleteRequest(item)}
              className="bg-transparent border-none text-[#bbb] cursor-pointer text-base"
            >×</button>
          </div>
        )}
      </div>

      {/* 재고 편집 패널 */}
      {!isAllStores && stockEdit?.itemId === item.id && (
        <div className="my-1 mb-2 px-4 py-3 bg-[#eff6ff] rounded-lg border border-[#bfdbfe] flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
            <input
              type="checkbox"
              checked={stockEdit.stockEnabled}
              onChange={(e) => onStockChange('stockEnabled', e.target.checked)}
            />
            재고 관리 활성화
          </label>
          <label className="flex items-center gap-1.5 text-[13px]">
            재고 수량
            <input
              type="number"
              min={0}
              value={stockEdit.stock}
              disabled={!stockEdit.stockEnabled}
              onChange={(e) => onStockChange('stock', Math.max(0, parseInt(e.target.value) || 0))}
              className="w-[70px] px-2 py-1 border border-[#93c5fd] rounded-md text-[13px]"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={onStockSave}
              disabled={stockSaving}
              className={`px-3.5 py-1 bg-[#2563eb] text-white border-none rounded-md text-xs ${stockSaving ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {stockSaving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={onCloseStockEdit}
              className="px-3.5 py-1 bg-transparent border border-[#d1d5db] rounded-md cursor-pointer text-xs"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 아이템 이미지 패널 */}
      {imageOpenId === `item-${item.id}` && (
        <div className="my-1 mb-2 px-4 py-3 bg-[#fff8f5] rounded-lg border border-[#ffd5c2]">
          <div className="font-semibold text-[13px] mb-2">메뉴 이미지 관리</div>
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

  // dnd-kit transform style 유지 (라이브러리 요구사항)
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
    <div ref={setNodeRef} style={style} className="bg-white rounded-xl p-5 mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          {!isAllStores && (
            <span
              {...attributes}
              {...listeners}
              className="cursor-grab text-[#bbb] text-xl select-none px-1"
              title="드래그하여 카테고리 순서 변경"
            >
              ⠿
            </span>
          )}
          <div>
            <h3 className="m-0">{cat.name}</h3>
            {isAllStores && cat.storeId && storeNameMap[cat.storeId] && (
              <span className="text-xs text-[#888]">🏪 {storeNameMap[cat.storeId]}</span>
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => onImageToggle(`cat-${cat.id}`)}
            className={`px-2.5 py-1 border border-[#ff6b35] rounded-md cursor-pointer text-xs ${
              imageOpenId === `cat-${cat.id}` ? 'bg-[#ff6b35] text-white' : 'bg-transparent text-brand'
            }`}
          >
            🖼️ 이미지
          </button>
          {!isAllStores && (
            <button
              onClick={() => onDeleteCategoryRequest(cat)}
              className="bg-transparent text-[#e53935] border border-[#e53935] px-2.5 py-1 rounded-md cursor-pointer text-xs"
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {/* 카테고리 이미지 패널 */}
      {imageOpenId === `cat-${cat.id}` && (
        <div className="mt-1 mb-3 px-4 py-3 bg-[#fff8f5] rounded-lg border border-[#ffd5c2]">
          <div className="font-semibold text-[13px] mb-2">카테고리 이미지 관리</div>
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
      {!cat.items?.length && <p className="text-[#888] text-sm">메뉴가 없습니다.</p>}
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
      <div className="flex items-center gap-3 mb-6">
        <h2 className="m-0">메뉴 관리</h2>
        {superAdmin && (
          <span className={`px-3 py-1 rounded-full text-[13px] font-semibold ${
            isAllStores ? 'bg-[#e8f5e9] text-[#1b5e20]' : 'bg-[#e3f2fd] text-[#0d47a1]'
          }`}>
            {isAllStores ? '전체 매장' : (storeNameMap[currentStoreId!] || '선택된 매장')}
          </span>
        )}
      </div>

      {isAllStores ? (
        <div className="bg-[#fff8e1] border border-[#ffe082] rounded-xl px-5 py-4 mb-6 text-[#795548]">
          전체 보기 모드입니다. 메뉴를 추가/수정하려면 상단에서 매장을 선택해주세요.
        </div>
      ) : (
        <>
          {/* 카테고리 추가 */}
          <div className="bg-white rounded-xl p-5 mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <h3 className="mt-0 mb-3">카테고리 추가</h3>
            <div className="flex gap-2">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="카테고리명"
                className="flex-1 px-3 py-2 border border-[#ddd] rounded-lg"
              />
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 bg-[#ff6b35] text-white border-none rounded-lg cursor-pointer"
              >
                추가
              </button>
            </div>
          </div>

          {/* 메뉴 아이템 추가 */}
          <div className="bg-white rounded-xl p-5 mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <h3 className="mt-0 mb-3">메뉴 아이템 추가</h3>
            <div className="flex gap-2 flex-wrap">
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="px-3 py-2 border border-[#ddd] rounded-lg"
              >
                <option value="">카테고리 선택</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="메뉴명"
                className="flex-1 px-3 py-2 border border-[#ddd] rounded-lg"
              />
              <input
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                placeholder="가격"
                type="number"
                className="w-[100px] px-3 py-2 border border-[#ddd] rounded-lg"
              />
              <button
                onClick={handleAddItem}
                className="px-4 py-2 bg-[#ff6b35] text-white border-none rounded-lg cursor-pointer"
              >
                추가
              </button>
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
