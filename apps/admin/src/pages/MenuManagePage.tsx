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
  createOptionGroup as apiCreateOptionGroup,
  deleteOptionGroup as apiDeleteOptionGroup,
  createOption as apiCreateOption,
  deleteOption as apiDeleteOption,
  reorderCategories as apiReorderCategories,
  reorderItems as apiReorderItems,
  reorderOptionGroups as apiReorderOptionGroups,
  reorderOptions as apiReorderOptions,
} from '@admin/api/menu.api';
import { MenuCategory, MenuItem, MenuOptionGroup, MenuOption } from '@qr-order/shared-types';
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

// ─── SortableOptionRow ────────────────────────────────────────────────────────

function SortableOptionRow({
  option,
  disabled,
  onDelete,
}: {
  option: MenuOption;
  disabled: boolean;
  onDelete?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.id,
    disabled,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1.5 py-1 pl-2">
      {!disabled && (
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-[#ccc] text-sm select-none"
          title="드래그하여 옵션 순서 변경"
        >
          ⠿
        </span>
      )}
      <span className="text-[13px] text-[#555] flex-1">{option.name}</span>
      {option.additionalPrice > 0 && (
        <span className="text-[12px] text-[#888]">+{option.additionalPrice.toLocaleString()}원</span>
      )}
      {!option.isAvailable && (
        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#f3f4f6] text-[#9ca3af]">품절</span>
      )}
      {!disabled && onDelete && (
        <button
          onClick={onDelete}
          className="ml-1 bg-transparent border-none text-[#ccc] hover:text-[#e53935] cursor-pointer text-base leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
}

// ─── SortableOptionGroupCard ──────────────────────────────────────────────────

interface OptionGroupCardProps {
  group: MenuOptionGroup;
  disabled: boolean;
  onOptionDragEnd: (groupId: string, event: DragEndEvent) => void;
  onDeleteGroup?: () => void;
  onDeleteOption?: (optionId: string) => void;
  onAddOption?: (name: string, price: number) => void;
}

function SortableOptionGroupCard({
  group,
  disabled,
  onOptionDragEnd,
  onDeleteGroup,
  onDeleteOption,
  onAddOption,
}: OptionGroupCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
    disabled,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [addingOption, setAddingOption] = useState(false);
  const [newOptName, setNewOptName] = useState('');
  const [newOptPrice, setNewOptPrice] = useState('');

  const handleAddOption = () => {
    const name = newOptName.trim();
    if (!name) return;
    onAddOption?.(name, parseInt(newOptPrice) || 0);
    setNewOptName('');
    setNewOptPrice('');
    setAddingOption(false);
  };

  const optionIds = (group.options ?? []).map((o) => o.id);
  const optionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  return (
    <div ref={setNodeRef} style={style} className="mt-2 border border-[#e5e7eb] rounded-lg bg-[#fafafa]">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#e5e7eb]">
        {!disabled && (
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab text-[#ccc] text-base select-none"
            title="드래그하여 옵션 그룹 순서 변경"
          >
            ⠿
          </span>
        )}
        <span className="font-medium text-[13px]">{group.name}</span>
        <span className={`ml-1 text-[11px] px-1.5 py-0.5 rounded-full ${
          group.isRequired
            ? 'bg-[#fee2e2] text-[#dc2626]'
            : 'bg-[#e0f2fe] text-[#0369a1]'
        }`}>
          {group.isRequired ? '필수' : '선택'}
        </span>
        <span className="text-[11px] text-[#9ca3af]">최대 {group.maxSelect}개</span>
        {!disabled && (
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => setAddingOption((v) => !v)}
              className="text-[11px] px-2 py-0.5 border border-[#6366f1] text-[#6366f1] bg-transparent rounded cursor-pointer"
            >
              + 옵션
            </button>
            <button
              onClick={onDeleteGroup}
              className="bg-transparent border-none text-[#ccc] hover:text-[#e53935] cursor-pointer text-base leading-none"
            >
              ×
            </button>
          </div>
        )}
      </div>
      <div className="px-2 py-1">
        <DndContext
          sensors={optionSensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => onOptionDragEnd(group.id, e)}
        >
          <SortableContext items={optionIds} strategy={verticalListSortingStrategy}>
            {(group.options ?? []).map((opt) => (
              <SortableOptionRow
                key={opt.id}
                option={opt}
                disabled={disabled}
                onDelete={onDeleteOption ? () => onDeleteOption(opt.id) : undefined}
              />
            ))}
          </SortableContext>
        </DndContext>
        {addingOption && (
          <div className="flex gap-1.5 mt-1.5 px-1">
            <input
              value={newOptName}
              onChange={(e) => setNewOptName(e.target.value)}
              placeholder="옵션명"
              className="flex-1 px-2 py-1 border border-[#d1d5db] rounded text-[13px]"
              onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
            />
            <input
              value={newOptPrice}
              onChange={(e) => setNewOptPrice(e.target.value)}
              placeholder="추가금액"
              type="number"
              min={0}
              className="w-[80px] px-2 py-1 border border-[#d1d5db] rounded text-[13px]"
              onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
            />
            <button
              onClick={handleAddOption}
              className="px-2.5 py-1 bg-[#6366f1] text-white border-none rounded text-[12px] cursor-pointer"
            >
              추가
            </button>
            <button
              onClick={() => setAddingOption(false)}
              className="px-2 py-1 bg-transparent border border-[#d1d5db] rounded text-[12px] cursor-pointer"
            >
              취소
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SortableMenuItemRow ──────────────────────────────────────────────────────

interface MenuItemRowProps {
  item: MenuItem;
  isAllStores: boolean;
  stockEdit: StockEditState | null;
  stockSaving: boolean;
  imageOpenId: string | null;
  expandedOptionGroups: boolean;
  onToggleOptionGroups: () => void;
  onOpenStockEdit: (item: MenuItem) => void;
  onCloseStockEdit: () => void;
  onStockChange: (field: 'stockEnabled' | 'stock', value: boolean | number) => void;
  onStockSave: () => void;
  onImageToggle: (id: string) => void;
  onDeleteRequest: (item: MenuItem) => void;
  onOptionGroupDragEnd: (menuItemId: string, event: DragEndEvent) => void;
  onOptionDragEnd: (groupId: string, event: DragEndEvent) => void;
  onDeleteOptionGroup: (groupId: string) => void;
  onDeleteOption: (optionId: string) => void;
  onAddOption: (groupId: string, name: string, price: number) => void;
  onAddOptionGroup: (menuItemId: string, name: string, isRequired: boolean, maxSelect: number) => void;
}

function SortableMenuItemRow({
  item,
  isAllStores,
  stockEdit,
  stockSaving,
  imageOpenId,
  expandedOptionGroups,
  onToggleOptionGroups,
  onOpenStockEdit,
  onCloseStockEdit,
  onStockChange,
  onStockSave,
  onImageToggle,
  onDeleteRequest,
  onOptionGroupDragEnd,
  onOptionDragEnd,
  onDeleteOptionGroup,
  onDeleteOption,
  onAddOption,
  onAddOptionGroup,
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

  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupRequired, setNewGroupRequired] = useState(false);
  const [newGroupMax, setNewGroupMax] = useState('1');

  const handleAddGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    onAddOptionGroup(item.id, name, newGroupRequired, parseInt(newGroupMax) || 1);
    setNewGroupName('');
    setNewGroupRequired(false);
    setNewGroupMax('1');
    setAddingGroup(false);
  };

  const optionGroups = item.optionGroups ?? [];
  const groupIds = optionGroups.map((g) => g.id);
  const groupSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

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
        <div className="flex gap-1.5">
          <button
            onClick={onToggleOptionGroups}
            className={`px-2 py-0.5 border rounded-md cursor-pointer text-[11px] ${
              expandedOptionGroups
                ? 'bg-[#6366f1] text-white border-[#6366f1]'
                : 'bg-transparent text-[#6366f1] border-[#6366f1]'
            }`}
          >
            옵션{optionGroups.length > 0 ? ` ${optionGroups.length}` : ''}
          </button>
          {!isAllStores && (
            <>
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
            </>
          )}
        </div>
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

      {/* 옵션 그룹 패널 */}
      {expandedOptionGroups && (
        <div className="mb-2 px-3 py-2 bg-[#f5f3ff] rounded-lg border border-[#ddd6fe]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] text-[#7c3aed] font-semibold">옵션 그룹</span>
            {!isAllStores && (
              <button
                onClick={() => setAddingGroup((v) => !v)}
                className="text-[11px] px-2 py-0.5 border border-[#7c3aed] text-[#7c3aed] bg-transparent rounded cursor-pointer"
              >
                + 그룹 추가
              </button>
            )}
          </div>
          <DndContext
            sensors={groupSensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => onOptionGroupDragEnd(item.id, e)}
          >
            <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
              {optionGroups.map((group) => (
                <SortableOptionGroupCard
                  key={group.id}
                  group={group}
                  disabled={isAllStores}
                  onOptionDragEnd={onOptionDragEnd}
                  onDeleteGroup={() => onDeleteOptionGroup(group.id)}
                  onDeleteOption={(optionId) => onDeleteOption(optionId)}
                  onAddOption={(name, price) => onAddOption(group.id, name, price)}
                />
              ))}
            </SortableContext>
          </DndContext>
          {optionGroups.length === 0 && (
            <p className="text-[#aaa] text-[12px] mt-1">옵션 그룹이 없습니다.</p>
          )}
          {!isAllStores && addingGroup && (
            <div className="mt-2 p-3 bg-white rounded-lg border border-[#c4b5fd] flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="그룹명 (예: 사이즈, 토핑)"
                  className="flex-1 px-2 py-1.5 border border-[#d1d5db] rounded text-[13px]"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                />
                <input
                  value={newGroupMax}
                  onChange={(e) => setNewGroupMax(e.target.value)}
                  placeholder="최대 선택"
                  type="number"
                  min={1}
                  className="w-[70px] px-2 py-1.5 border border-[#d1d5db] rounded text-[13px]"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-[12px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newGroupRequired}
                    onChange={(e) => setNewGroupRequired(e.target.checked)}
                  />
                  필수 선택
                </label>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={handleAddGroup}
                    className="px-3 py-1 bg-[#7c3aed] text-white border-none rounded text-[12px] cursor-pointer"
                  >
                    추가
                  </button>
                  <button
                    onClick={() => setAddingGroup(false)}
                    className="px-3 py-1 bg-transparent border border-[#d1d5db] rounded text-[12px] cursor-pointer"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SortableCategoryCard ─────────────────────────────────────────────────────

interface CategoryCardProps {
  cat: MenuCategory;
  isAllStores: boolean;
  storeNameMap: Record<string, string>;
  stockEdit: StockEditState | null;
  stockSaving: boolean;
  imageOpenId: string | null;
  expandedItemIds: Set<string>;
  onOpenStockEdit: (item: MenuItem) => void;
  onCloseStockEdit: () => void;
  onStockChange: (field: 'stockEnabled' | 'stock', value: boolean | number) => void;
  onStockSave: () => void;
  onImageToggle: (id: string) => void;
  onDeleteCategoryRequest: (cat: MenuCategory) => void;
  onDeleteItemRequest: (item: MenuItem) => void;
  onItemDragEnd: (categoryId: string, event: DragEndEvent) => void;
  onToggleOptionGroups: (itemId: string) => void;
  onOptionGroupDragEnd: (menuItemId: string, event: DragEndEvent) => void;
  onOptionDragEnd: (groupId: string, event: DragEndEvent) => void;
  onDeleteOptionGroup: (groupId: string) => void;
  onDeleteOption: (optionId: string) => void;
  onAddOption: (groupId: string, name: string, price: number) => void;
  onAddOptionGroup: (menuItemId: string, name: string, isRequired: boolean, maxSelect: number) => void;
}

function SortableCategoryCard({
  cat,
  isAllStores,
  storeNameMap,
  stockEdit,
  stockSaving,
  imageOpenId,
  expandedItemIds,
  onOpenStockEdit,
  onCloseStockEdit,
  onStockChange,
  onStockSave,
  onImageToggle,
  onDeleteCategoryRequest,
  onDeleteItemRequest,
  onItemDragEnd,
  onToggleOptionGroups,
  onOptionGroupDragEnd,
  onOptionDragEnd,
  onDeleteOptionGroup,
  onDeleteOption,
  onAddOption,
  onAddOptionGroup,
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
              expandedOptionGroups={expandedItemIds.has(item.id)}
              onToggleOptionGroups={() => onToggleOptionGroups(item.id)}
              onOpenStockEdit={onOpenStockEdit}
              onCloseStockEdit={onCloseStockEdit}
              onStockChange={onStockChange}
              onStockSave={onStockSave}
              onImageToggle={onImageToggle}
              onDeleteRequest={onDeleteItemRequest}
              onOptionGroupDragEnd={onOptionGroupDragEnd}
              onOptionDragEnd={onOptionDragEnd}
              onDeleteOptionGroup={onDeleteOptionGroup}
              onDeleteOption={onDeleteOption}
              onAddOption={onAddOption}
              onAddOptionGroup={onAddOptionGroup}
            />
          ))}
        </SortableContext>
      </DndContext>
      {!cat.items?.length && <p className="text-[#888] text-sm">메뉴가 없습니다.</p>}
    </div>
  );
}

// ─── MenuManagePage ───────────────────────────────────────────────────────────

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
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());
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

  const handleToggleOptionGroups = (itemId: string) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
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

  const handleOptionGroupDragEnd = async (menuItemId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    let catIdx = -1, itemIdx = -1;
    categories.forEach((cat, ci) => {
      (cat.items ?? []).forEach((item, ii) => {
        if (item.id === menuItemId) { catIdx = ci; itemIdx = ii; }
      });
    });
    if (catIdx === -1) return;
    const groups = categories[catIdx].items![itemIdx].optionGroups ?? [];
    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);
    const reorderedGroups = arrayMove(groups, oldIndex, newIndex);
    const updated = categories.map((cat, ci) =>
      ci !== catIdx ? cat : {
        ...cat,
        items: (cat.items ?? []).map((item, ii) =>
          ii !== itemIdx ? item : { ...item, optionGroups: reorderedGroups },
        ),
      },
    );
    setCategories(updated);
    try {
      await apiReorderOptionGroups({ orders: reorderedGroups.map((g, i) => ({ id: g.id, sortOrder: i })) });
    } catch {
      fetchMenu();
    }
  };

  const handleOptionDragEnd = async (groupId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    let catIdx = -1, itemIdx = -1, groupIdx = -1;
    categories.forEach((cat, ci) => {
      (cat.items ?? []).forEach((item, ii) => {
        (item.optionGroups ?? []).forEach((g, gi) => {
          if (g.id === groupId) { catIdx = ci; itemIdx = ii; groupIdx = gi; }
        });
      });
    });
    if (catIdx === -1) return;
    const options = categories[catIdx].items![itemIdx].optionGroups![groupIdx].options ?? [];
    const oldIndex = options.findIndex((o) => o.id === active.id);
    const newIndex = options.findIndex((o) => o.id === over.id);
    const reorderedOptions = arrayMove(options, oldIndex, newIndex);
    const updated = categories.map((cat, ci) =>
      ci !== catIdx ? cat : {
        ...cat,
        items: (cat.items ?? []).map((item, ii) =>
          ii !== itemIdx ? item : {
            ...item,
            optionGroups: (item.optionGroups ?? []).map((g, gi) =>
              gi !== groupIdx ? g : { ...g, options: reorderedOptions },
            ),
          },
        ),
      },
    );
    setCategories(updated);
    try {
      await apiReorderOptions({ orders: reorderedOptions.map((o, i) => ({ id: o.id, sortOrder: i })) });
    } catch {
      fetchMenu();
    }
  };

  const handleDeleteOptionGroup = async (groupId: string) => {
    await apiDeleteOptionGroup(groupId);
    fetchMenu();
  };

  const handleDeleteOption = async (optionId: string) => {
    await apiDeleteOption(optionId);
    fetchMenu();
  };

  const handleAddOption = async (groupId: string, name: string, price: number) => {
    await apiCreateOption({ groupId, name, additionalPrice: price });
    fetchMenu();
  };

  const handleAddOptionGroup = async (
    menuItemId: string,
    name: string,
    isRequired: boolean,
    maxSelect: number,
  ) => {
    await apiCreateOptionGroup({ menuItemId, name, isRequired, maxSelect, options: [] });
    fetchMenu();
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
              expandedItemIds={expandedItemIds}
              onOpenStockEdit={openStockEdit}
              onCloseStockEdit={() => setStockEdit(null)}
              onStockChange={handleStockChange}
              onStockSave={handleStockSave}
              onImageToggle={handleImageToggle}
              onDeleteCategoryRequest={(c) => setDeleteTarget({ type: 'category', id: c.id, name: c.name })}
              onDeleteItemRequest={(item) => setDeleteTarget({ type: 'item', id: item.id, name: item.name })}
              onItemDragEnd={handleItemDragEnd}
              onToggleOptionGroups={handleToggleOptionGroups}
              onOptionGroupDragEnd={handleOptionGroupDragEnd}
              onOptionDragEnd={handleOptionDragEnd}
              onDeleteOptionGroup={handleDeleteOptionGroup}
              onDeleteOption={handleDeleteOption}
              onAddOption={handleAddOption}
              onAddOptionGroup={handleAddOptionGroup}
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
