import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { getTables, generateQrToken, getQrToken } from '../api/table.api';
import { Table } from '@qr-order/shared-types';

export default function QRGeneratePage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [qrData, setQrData] = useState<{ token: string } | null>(null);

  useEffect(() => {
    getTables().then(setTables);
  }, []);

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
  };

  const getQrUrl = () => {
    if (!selectedTable || !qrData) return '';
    return `${window.location.origin.replace(':3002', ':3001')}/entry?tableId=${selectedTable.id}&token=${qrData.token}`;
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
        <div className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <h3 className="mt-0 mb-4">테이블 선택</h3>
          {tables.map((table) => (
            <div
              key={table.id}
              onClick={() => handleSelectTable(table)}
              className={`px-4 py-3 rounded-lg mb-2 cursor-pointer border ${
                selectedTable?.id === table.id
                  ? 'border-brand bg-[#fff5f2]'
                  : 'border-[#eee] bg-white'
              }`}
            >
              <span className="font-semibold">{table.tableNumber}번 - {table.name}</span>
            </div>
          ))}
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
