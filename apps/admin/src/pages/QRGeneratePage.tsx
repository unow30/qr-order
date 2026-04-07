import { useEffect, useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  getTablesWithTokens,
  generateQrToken,
  getQrToken,
} from '@admin/api/table.api';
import { getStores, Store } from '@admin/api/store.api';
import { useAuthStore } from '@admin/stores/authStore';
import { Table } from '@qr-order/shared-types';

interface TableWithToken {
  table: Table;
  token: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

type TokenStatus = 'valid' | 'missing' | 'expired';

const getTokenStatus = (item: TableWithToken): TokenStatus => {
  if (!item.token) return 'missing';
  if (item.expiresAt && new Date(item.expiresAt).getTime() < Date.now()) return 'expired';
  return 'valid';
};

export default function QRGeneratePage() {
  const currentStoreId = useAuthStore((s) => s.currentStoreId);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)();

  const [tables, setTables] = useState<TableWithToken[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [qrData, setQrData] = useState<{ token: string } | null>(null);

  const loadTables = () => {
    getTablesWithTokens()
      .then(setTables)
      .catch(() => setTables([]));
  };

  useEffect(() => {
    // 매장 전환 시 이전 선택 초기화
    setSelectedTable(null);
    setQrData(null);
    loadTables();
  }, [currentStoreId]);

  useEffect(() => {
    // 전체보기(SUPER_ADMIN, currentStoreId 없음) 시 매장명 표시를 위해 매장 목록 로드
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

  const handleSelectTable = async (table: Table) => {
    setSelectedTable(table);
    try {
      const existing = await getQrToken(table.id);
      setQrData(existing);
    } catch {
      setQrData(null);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTable) return;
    const token = await generateQrToken(selectedTable.id);
    setQrData(token);
    loadTables();
  };

  const getQrUrl = () => {
    if (!selectedTable || !qrData) return '';
    const webBaseUrl =
      import.meta.env.VITE_WEB_URL ||
      window.location.origin.replace('admin.', 'www.').replace(':3002', ':3001');
    return `${webBaseUrl}/entry?tableId=${selectedTable.id}&token=${qrData.token}`;
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

  const renderStatusBadge = (status: TokenStatus) => {
    if (status === 'valid') {
      return (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#e8f5e9] text-[#2e7d32]">
          정상
        </span>
      );
    }
    if (status === 'expired') {
      return (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#fdecea] text-[#c62828]">
          만료됨
        </span>
      );
    }
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f0f0f0] text-[#666]">
        미발급
      </span>
    );
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
              const status = getTokenStatus(item);
              const isSelected = selectedTable?.id === item.table.id;
              const borderClass =
                status === 'expired'
                  ? 'border-[#f5b0aa]'
                  : status === 'missing'
                  ? 'border-[#ddd]'
                  : 'border-[#eee]';
              const bgClass =
                status === 'expired'
                  ? 'bg-[#fff5f5]'
                  : status === 'missing'
                  ? 'bg-[#fafafa]'
                  : 'bg-white';
              return (
                <div
                  key={item.table.id}
                  onClick={() => handleSelectTable(item.table)}
                  className={`px-4 py-3 rounded-lg mb-2 cursor-pointer border ${
                    isSelected ? 'border-brand bg-[#fff5f2]' : `${borderClass} ${bgClass}`
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {item.table.tableNumber}번 - {item.table.name}
                    </span>
                    {renderStatusBadge(status)}
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
              {qrData ? (
                <>
                  <div className="inline-block p-4 bg-white rounded-lg border border-[#eee]">
                    <QRCodeCanvas value={getQrUrl()} size={200} />
                  </div>
                  <p className="text-xs text-[#888] mt-2 break-all">{getQrUrl()}</p>
                  <div className="flex gap-2 justify-center mt-4">
                    <button onClick={handleDownload} className="px-4 py-2 bg-[#3f51b5] text-white border-none rounded-lg cursor-pointer">
                      다운로드
                    </button>
                    <button onClick={handleGenerate} className="px-4 py-2 bg-brand text-white border-none rounded-lg cursor-pointer">
                      재발급
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-8">
                  <p className="text-[#888] mb-4">QR 코드가 없습니다.</p>
                  <button onClick={handleGenerate} className="px-5 py-2.5 bg-brand text-white border-none rounded-lg cursor-pointer">
                    QR 코드 발급
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-[#888] p-8">왼쪽에서 테이블을 선택하세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}
