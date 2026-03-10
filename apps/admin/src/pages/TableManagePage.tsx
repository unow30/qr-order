import { useEffect, useState } from 'react';
import { getTables, createTable, deleteTable } from '../api/table.api';
import { Table } from '@qr-order/shared-types';
import ConfirmDialog from '../components/ConfirmDialog';

export default function TableManagePage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [tableName, setTableName] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchTables = () => getTables().then(setTables);
  useEffect(() => { fetchTables(); }, []);

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
      <h2 style={{ margin: '0 0 24px' }}>테이블 관리</h2>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 12px' }}>테이블 추가</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="테이블 번호" type="number" style={{ width: 120, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8 }} />
          <input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="테이블 이름 (예: A-1)" style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8 }} />
          <button onClick={handleCreate} style={{ padding: '8px 16px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>추가</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {tables.map((table) => (
          <div key={table.id} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 18 }}>{table.tableNumber}번</p>
                <p style={{ margin: '0 0 4px', color: '#666' }}>{table.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#888' }}>최대 {table.capacity}인</p>
              </div>
              <button onClick={() => setDeleteTargetId(table.id)} style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
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
