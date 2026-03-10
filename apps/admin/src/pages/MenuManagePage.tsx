import { useEffect, useState } from 'react';
import { getMenu, createCategory, deleteCategory, createItem, deleteItem } from '../api/menu.api';
import { MenuCategory } from '@qr-order/shared-types';
import ConfirmDialog from '../components/ConfirmDialog';

type DeleteTarget =
  | { type: 'category'; id: string; name: string }
  | { type: 'item'; id: string; name: string };

export default function MenuManagePage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const fetchMenu = () => getMenu().then(setCategories);

  useEffect(() => { fetchMenu(); }, []);

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

  const dialogMessage = deleteTarget?.type === 'category'
    ? `'${deleteTarget.name}' 카테고리를 삭제하면 해당 메뉴도 모두 삭제됩니다.`
    : `'${deleteTarget?.name}' 메뉴를 삭제하시겠습니까?`;

  return (
    <div>
      <h2 style={{ margin: '0 0 24px' }}>메뉴 관리</h2>

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

      {/* 카테고리/메뉴 목록 */}
      {categories.map((cat) => (
        <div key={cat.id} style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{cat.name}</h3>
            <button
              onClick={() => setDeleteTarget({ type: 'category', id: cat.id, name: cat.name })}
              style={{ background: 'none', color: '#e53935', border: '1px solid #e53935', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
            >
              삭제
            </button>
          </div>
          {cat.items?.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
              <div>
                <span style={{ fontWeight: 500 }}>{item.name}</span>
                <span style={{ marginLeft: 12, color: '#ff6b35' }}>{item.price.toLocaleString()}원</span>
              </div>
              <button
                onClick={() => setDeleteTarget({ type: 'item', id: item.id, name: item.name })}
                style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16 }}
              >×</button>
            </div>
          ))}
          {!cat.items?.length && <p style={{ color: '#888', fontSize: 14 }}>메뉴가 없습니다.</p>}
        </div>
      ))}

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
