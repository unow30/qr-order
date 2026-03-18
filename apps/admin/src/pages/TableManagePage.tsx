import { useEffect, useState } from 'react';
import { getTables, createTable, deleteTable } from '../api/table.api';
import { Table } from '@qr-order/shared-types';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuthStore } from '../stores/authStore';
import { useStoreNames } from '../hooks/useStoreNames';
import ImageManagerWidget from '../components/ImageManagerWidget';

export default function TableManagePage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [tableName, setTableName] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [imageOpenId, setImageOpenId] = useState<string | null>(null);
  const { currentStoreId, isSuperAdmin } = useAuthStore();
  const superAdmin = isSuperAdmin();
  const isAllStores = superAdmin && !currentStoreId;
  const storeNameMap = useStoreNames();

  const fetchTables = () => getTables().then(setTables);

  useEffect(() => { fetchTables(); }, [currentStoreId]);

  const handleCreate = async () => {
    if (!tableNumber || !tableName.trim()) return;
    await createTable({ tableNumber: parseInt(tableNumber), name: tableName });
    setTableNumber('');
    setTableName('');
    fetchTables();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    await deleteTable(deleteTargetId);
    setDeleteTargetId(null);
    fetchTables();
  };

  const deleteTarget = tables.find((t) => t.id === deleteTargetId);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="m-0">테이블 관리</h2>
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
          전체 보기 모드입니다. 테이블을 추가/삭제하려면 상단에서 매장을 선택해주세요.
        </div>
      ) : (
        <div className="bg-white rounded-xl p-5 mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <h3 className="mt-0 mb-3">테이블 추가</h3>
          <div className="flex gap-2">
            <input
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="테이블 번호"
              type="number"
              className="w-[120px] px-3 py-2 border border-[#ddd] rounded-lg"
            />
            <input
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="테이블 이름 (예: A-1)"
              className="flex-1 px-3 py-2 border border-[#ddd] rounded-lg"
            />
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-[#ff6b35] text-white border-none rounded-lg cursor-pointer"
            >
              추가
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {tables.map((table) => (
          <div key={table.id} className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex justify-between items-start">
              <div>
                <p className="m-0 mb-1 font-bold text-lg">{table.tableNumber}번</p>
                <p className="m-0 mb-1 text-[#666]">{table.name}</p>
                <p className="m-0 text-xs text-[#888]">최대 {table.capacity}인</p>
                {isAllStores && table.storeId && storeNameMap[table.storeId] && (
                  <p className="mt-1 m-0 text-xs text-[#aaa]">🏪 {storeNameMap[table.storeId]}</p>
                )}
              </div>
              {!isAllStores && (
                <button
                  onClick={() => setDeleteTargetId(table.id)}
                  className="bg-transparent border-none text-[#bbb] cursor-pointer text-lg"
                >
                  ×
                </button>
              )}
            </div>
            <button
              onClick={() => setImageOpenId(imageOpenId === table.id ? null : table.id)}
              className={`mt-2.5 w-full px-2.5 py-1 border border-[#ff6b35] rounded-md cursor-pointer text-xs ${
                imageOpenId === table.id ? 'bg-[#ff6b35] text-white' : 'bg-transparent text-brand'
              }`}
            >
              🖼️ 이미지 관리
            </button>
            {imageOpenId === table.id && (
              <div className="mt-2 border-t border-[#f0f0f0] pt-2">
                <ImageManagerWidget entityType="tables" entityId={table.id} readonly={isAllStores} />
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="테이블 삭제"
        message={deleteTarget ? `${deleteTarget.tableNumber}번 테이블(${deleteTarget.name})을 삭제하시겠습니까?` : ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
