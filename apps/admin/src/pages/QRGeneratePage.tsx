import { useEffect, useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { getTablesWithTokens } from '@admin/api/table.api';
import { getStores, Store } from '@admin/api/store.api';
import { useAuthStore } from '@admin/stores/authStore';
import { Table } from '@qr-order/shared-types';

interface TableWithToken {
  table: Table;
  token: string;
  isActive: boolean;
}

export default function QRGeneratePage() {
  const currentStoreId = useAuthStore((s) => s.currentStoreId);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)();

  const [tables, setTables] = useState<TableWithToken[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  const loadTables = () => {
    getTablesWithTokens()
      .then(setTables)
      .catch(() => setTables([]));
  };

  useEffect(() => {
    setSelectedTable(null);
    loadTables();
  }, [currentStoreId]);

  useEffect(() => {
    if (isSuperAdmin && !currentStoreId) {
      getStores()
        .then(setStores)
        .catch(() => setStores([]));
    }
  }, [isSuperAdmin, currentStoreId]);

  const storeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    stores.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [stores]);

  const handleSelectTable = (table: Table) => {
    setSelectedTable(table);
  };

  const getQrUrl = () => {
    if (!selectedTable) return '';
    const webBaseUrl =
      import.meta.env.VITE_WEB_URL ||
      window.location.origin.replace('admin.', 'www.').replace(':3002', ':3001');
    return `${webBaseUrl}/entry?tableId=${selectedTable.id}&token=${selectedTable.qrToken}`;
  };

  const handleDownload = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-table-${selectedTable?.tableNumber}.png`;
    a.click();
  };

  return (
    <div>
      <h2 className="mb-6 mt-0">QR 코드 생성</h2>
      <div className="grid grid-cols-2 gap-6">
        {/* 테이블 선택 */}
        <div className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex flex-col max-h-[calc(100vh-180px)]">
          <h3 className="mt-0 mb-4">테이블 선택</h3>
          <div className="overflow-y-auto pr-1 -mr-1 flex-1">
            {tables.length === 0 && (
              <p className="text-[#888] text-sm m-0">등록된 테이블이 없습니다.</p>
            )}
            {tables.map((item) => {
              const isSelected = selectedTable?.id === item.table.id;
              return (
                <div
                  key={item.table.id}
                  onClick={() => handleSelectTable(item.table)}
                  className={`px-4 py-3 rounded-lg mb-2 cursor-pointer border ${
                    isSelected ? 'border-brand bg-[#fff5f2]' : 'border-[#eee] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {item.table.tableNumber}번 - {item.table.name}
                    </span>
                  </div>
                  {isSuperAdmin && !currentStoreId && (
                    <div className="text-[11px] text-[#888] mt-1">
                      {storeNameMap.get(item.table.storeId) ?? item.table.storeId}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* QR 코드 */}
        <div className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-center">
          <h3 className="mt-0 mb-4">QR 코드</h3>
          {selectedTable ? (
            <>
              <div className="inline-block p-4 bg-white rounded-lg border border-[#eee]">
                <QRCodeCanvas value={getQrUrl()} size={200} />
              </div>
              <p className="text-xs text-[#888] mt-2 break-all">{getQrUrl()}</p>
              <div className="flex gap-2 justify-center mt-4">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-[#3f51b5] text-white border-none rounded-lg cursor-pointer"
                >
                  다운로드
                </button>
              </div>
            </>
          ) : (
            <p className="text-[#888] p-8">왼쪽에서 테이블을 선택하세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}
